/**
 * Context Manager Skill
 *
 * Manages shared context across sub-agent executions, ensuring
 * isolation when needed and controlled sharing when appropriate.
 */

class ContextManager {
  constructor(config = {}) {
    this.config = {
      maxContextSize: config.maxContextSize || 1000000,
      enablePersistence: config.enablePersistence || false,
      isolationLevel: config.isolationLevel || 'partial',
      ...config
    };

    this.globalContext = new Map();
    this.agentContexts = new Map();
    this.sharedData = new Map();
    this.contextHistory = [];
  }

  /**
   * Create a new context for an agent execution
   * @param {string} agentId - The agent identifier
   * @param {Object} options - Context options
   * @returns {Object} The created context
   */
  createContext(agentId, options = {}) {
    const contextId = this.generateContextId();

    const context = {
      id: contextId,
      agentId,
      createdAt: Date.now(),
      isolationLevel: options.isolationLevel || this.config.isolationLevel,
      data: new Map(),
      inherited: new Map(),
      outputs: new Map(),
      metadata: {
        parentContext: options.parentContext || null,
        tags: options.tags || [],
        ttl: options.ttl || null
      }
    };

    // Inherit from parent context if specified
    if (options.parentContext) {
      const parent = this.agentContexts.get(options.parentContext);
      if (parent) {
        this.inheritContext(context, parent, options.inheritKeys || []);
      }
    }

    // Inherit from global context based on isolation level
    if (context.isolationLevel !== 'full') {
      this.inheritGlobalContext(context, options.globalKeys || []);
    }

    this.agentContexts.set(contextId, context);
    this.contextHistory.push({
      action: 'create',
      contextId,
      agentId,
      timestamp: Date.now()
    });

    return this.wrapContext(context);
  }

  /**
   * Get context by ID
   */
  getContext(contextId) {
    const context = this.agentContexts.get(contextId);
    if (!context) return null;
    return this.wrapContext(context);
  }

  /**
   * Set a value in context
   */
  set(contextId, key, value, options = {}) {
    const context = this.agentContexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // Check size limits
    const valueSize = JSON.stringify(value).length;
    if (valueSize > this.config.maxContextSize) {
      throw new Error(`Value exceeds maximum context size`);
    }

    context.data.set(key, {
      value,
      metadata: {
        setAt: Date.now(),
        setBy: context.agentId,
        shared: options.shared || false,
        readonly: options.readonly || false
      }
    });

    // Share with other contexts if specified
    if (options.shared) {
      this.sharedData.set(key, {
        value,
        sourceContext: contextId,
        sourceAgent: context.agentId
      });
    }

    this.contextHistory.push({
      action: 'set',
      contextId,
      key,
      timestamp: Date.now()
    });
  }

  /**
   * Get a value from context
   */
  get(contextId, key, defaultValue = undefined) {
    const context = this.agentContexts.get(contextId);
    if (!context) return defaultValue;

    // Check local data first
    if (context.data.has(key)) {
      return context.data.get(key).value;
    }

    // Check inherited data
    if (context.inherited.has(key)) {
      return context.inherited.get(key).value;
    }

    // Check shared data (if not fully isolated)
    if (context.isolationLevel !== 'full' && this.sharedData.has(key)) {
      return this.sharedData.get(key).value;
    }

    // Check global context
    if (context.isolationLevel === 'none' && this.globalContext.has(key)) {
      return this.globalContext.get(key);
    }

    return defaultValue;
  }

  /**
   * Set output for an agent context
   */
  setOutput(contextId, key, value) {
    const context = this.agentContexts.get(contextId);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    context.outputs.set(key, {
      value,
      setAt: Date.now()
    });
  }

  /**
   * Get all outputs from a context
   */
  getOutputs(contextId) {
    const context = this.agentContexts.get(contextId);
    if (!context) return {};

    const outputs = {};
    for (const [key, data] of context.outputs) {
      outputs[key] = data.value;
    }
    return outputs;
  }

  /**
   * Merge outputs from one context into another
   */
  mergeOutputs(sourceContextId, targetContextId) {
    const source = this.agentContexts.get(sourceContextId);
    const target = this.agentContexts.get(targetContextId);

    if (!source || !target) {
      throw new Error('Source or target context not found');
    }

    for (const [key, data] of source.outputs) {
      target.inherited.set(key, {
        value: data.value,
        metadata: {
          inheritedFrom: sourceContextId,
          inheritedAt: Date.now()
        }
      });
    }
  }

  /**
   * Set global context value
   */
  setGlobal(key, value) {
    this.globalContext.set(key, value);
  }

  /**
   * Get global context value
   */
  getGlobal(key, defaultValue = undefined) {
    return this.globalContext.get(key) || defaultValue;
  }

  /**
   * Destroy a context
   */
  destroyContext(contextId) {
    const context = this.agentContexts.get(contextId);
    if (!context) return false;

    // Remove shared data from this context
    for (const [key, data] of this.sharedData) {
      if (data.sourceContext === contextId) {
        this.sharedData.delete(key);
      }
    }

    this.agentContexts.delete(contextId);

    this.contextHistory.push({
      action: 'destroy',
      contextId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Inherit context from parent
   */
  inheritContext(child, parent, keys = []) {
    const keysToInherit = keys.length > 0 ? keys : [...parent.data.keys()];

    for (const key of keysToInherit) {
      if (parent.data.has(key)) {
        const data = parent.data.get(key);
        child.inherited.set(key, {
          value: data.value,
          metadata: {
            inheritedFrom: parent.id,
            inheritedAt: Date.now(),
            originalMetadata: data.metadata
          }
        });
      }
    }

    // Also inherit outputs
    for (const [key, data] of parent.outputs) {
      child.inherited.set(key, {
        value: data.value,
        metadata: {
          inheritedFrom: parent.id,
          inheritedAt: Date.now()
        }
      });
    }
  }

  /**
   * Inherit from global context
   */
  inheritGlobalContext(context, keys = []) {
    const keysToInherit = keys.length > 0 ? keys : [...this.globalContext.keys()];

    for (const key of keysToInherit) {
      if (this.globalContext.has(key)) {
        context.inherited.set(key, {
          value: this.globalContext.get(key),
          metadata: {
            inheritedFrom: 'global',
            inheritedAt: Date.now()
          }
        });
      }
    }
  }

  /**
   * Generate unique context ID
   */
  generateContextId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wrap context for external use
   */
  wrapContext(context) {
    return {
      id: context.id,
      agentId: context.agentId,
      createdAt: context.createdAt,
      isolationLevel: context.isolationLevel,
      metadata: context.metadata,
      keys: [...context.data.keys(), ...context.inherited.keys()],
      outputKeys: [...context.outputs.keys()]
    };
  }

  /**
   * Get context statistics
   */
  getStats() {
    return {
      activeContexts: this.agentContexts.size,
      globalKeys: this.globalContext.size,
      sharedKeys: this.sharedData.size,
      historySize: this.contextHistory.length
    };
  }

  /**
   * Clear all contexts
   */
  clear() {
    this.agentContexts.clear();
    this.sharedData.clear();
    this.contextHistory = [];
  }
}

module.exports = ContextManager;
