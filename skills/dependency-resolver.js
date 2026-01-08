/**
 * Dependency Resolver Skill
 *
 * Resolves dependencies between sub-agent tasks using topological sorting
 * and detects circular dependencies.
 */

class DependencyResolver {
  constructor(config = {}) {
    this.config = {
      maxDepth: config.maxDepth || 50,
      ...config
    };
  }

  /**
   * Resolve task dependencies and return execution order
   * @param {Array} tasks - Array of tasks with dependencies
   * @returns {Object} Resolution result with ordered tasks
   */
  resolve(tasks) {
    if (!tasks || tasks.length === 0) {
      return { success: true, order: [], groups: [] };
    }

    // Build dependency graph
    const graph = this.buildGraph(tasks);

    // Check for circular dependencies
    const cycle = this.detectCycle(graph);
    if (cycle) {
      return {
        success: false,
        error: 'Circular dependency detected',
        cycle
      };
    }

    // Perform topological sort
    const order = this.topologicalSort(graph);

    // Group tasks that can run in parallel
    const groups = this.groupParallelTasks(order, graph);

    return {
      success: true,
      order,
      groups,
      graph: this.serializeGraph(graph)
    };
  }

  /**
   * Build dependency graph from tasks
   */
  buildGraph(tasks) {
    const graph = new Map();

    // Initialize nodes
    for (const task of tasks) {
      const id = task.id || task.name;
      graph.set(id, {
        id,
        task,
        dependencies: new Set(),
        dependents: new Set()
      });
    }

    // Add edges
    for (const task of tasks) {
      const id = task.id || task.name;
      const deps = task.dependencies || task.depends_on || [];

      for (const dep of deps) {
        if (graph.has(dep)) {
          graph.get(id).dependencies.add(dep);
          graph.get(dep).dependents.add(id);
        }
      }
    }

    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCycle(graph) {
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = graph.get(nodeId);
      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          const cycle = dfs(dep);
          if (cycle) return cycle;
        } else if (recursionStack.has(dep)) {
          // Found cycle
          const cycleStart = path.indexOf(dep);
          return path.slice(cycleStart).concat(dep);
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
      return null;
    };

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId);
        if (cycle) return cycle;
      }
    }

    return null;
  }

  /**
   * Perform topological sort using Kahn's algorithm
   */
  topologicalSort(graph) {
    const inDegree = new Map();
    const queue = [];
    const result = [];

    // Calculate in-degree for each node
    for (const [id, node] of graph) {
      inDegree.set(id, node.dependencies.size);
      if (node.dependencies.size === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);

      const node = graph.get(current);
      for (const dependent of node.dependents) {
        const newDegree = inDegree.get(dependent) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    return result;
  }

  /**
   * Group tasks that can run in parallel
   */
  groupParallelTasks(order, graph) {
    const groups = [];
    const completed = new Set();

    while (completed.size < order.length) {
      const group = [];

      for (const taskId of order) {
        if (completed.has(taskId)) continue;

        const node = graph.get(taskId);
        const depsCompleted = [...node.dependencies].every(d => completed.has(d));

        if (depsCompleted) {
          group.push(taskId);
        }
      }

      if (group.length === 0) break;

      groups.push(group);
      group.forEach(t => completed.add(t));
    }

    return groups;
  }

  /**
   * Serialize graph for output
   */
  serializeGraph(graph) {
    const serialized = {};

    for (const [id, node] of graph) {
      serialized[id] = {
        dependencies: [...node.dependencies],
        dependents: [...node.dependents]
      };
    }

    return serialized;
  }

  /**
   * Validate that all dependencies exist
   */
  validateDependencies(tasks) {
    const taskIds = new Set(tasks.map(t => t.id || t.name));
    const missing = [];

    for (const task of tasks) {
      const deps = task.dependencies || task.depends_on || [];
      for (const dep of deps) {
        if (!taskIds.has(dep)) {
          missing.push({
            task: task.id || task.name,
            missingDependency: dep
          });
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

module.exports = DependencyResolver;
