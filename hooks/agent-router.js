/**
 * Agent Router Hook
 *
 * This hook analyzes tasks and routes them to appropriate sub-agents.
 * It uses keyword matching, semantic analysis, and context awareness.
 */

const fs = require('fs');
const path = require('path');

class AgentRouter {
  constructor(config = {}) {
    this.config = {
      registryPath: config.registryPath || path.join(__dirname, '../subagents/registry.json'),
      defaultAgent: config.defaultAgent || 'fullstack-developer',
      maxAgents: config.maxAgents || 5,
      minConfidence: config.minConfidence || 0.3,
      ...config
    };

    this.registry = this.loadRegistry();
    this.keywordMap = this.buildKeywordMap();
  }

  /**
   * Load agent registry
   */
  loadRegistry() {
    try {
      const content = fs.readFileSync(this.config.registryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`[Router] Failed to load registry: ${error.message}`);
      return { categories: {}, routingKeywords: {} };
    }
  }

  /**
   * Build keyword to agent mapping
   */
  buildKeywordMap() {
    const map = new Map();

    // Use routing keywords from registry
    if (this.registry.routingKeywords) {
      for (const [keyword, agents] of Object.entries(this.registry.routingKeywords)) {
        map.set(keyword.toLowerCase(), { agents, weight: 1.0 });
      }
    }

    // Add agent names and descriptions as keywords
    for (const category of Object.values(this.registry.categories)) {
      for (const agent of category.agents) {
        // Agent ID as keyword
        map.set(agent.id.toLowerCase(), { agents: [agent.id], weight: 1.0 });

        // Parse agent ID parts (e.g., "backend-developer" -> ["backend", "developer"])
        const parts = agent.id.split('-');
        for (const part of parts) {
          if (part.length > 2) {
            const existing = map.get(part.toLowerCase());
            if (existing) {
              if (!existing.agents.includes(agent.id)) {
                existing.agents.push(agent.id);
              }
            } else {
              map.set(part.toLowerCase(), { agents: [agent.id], weight: 0.7 });
            }
          }
        }
      }
    }

    // Add common technology keywords
    const techKeywords = {
      'react': ['react-specialist', 'frontend-developer'],
      'vue': ['vue-expert', 'frontend-developer'],
      'angular': ['angular-architect', 'frontend-developer'],
      'node': ['backend-developer', 'javascript-pro'],
      'python': ['python-pro', 'django-developer', 'data-scientist'],
      'java': ['java-architect', 'spring-boot-engineer'],
      'typescript': ['typescript-pro', 'frontend-developer'],
      'kubernetes': ['kubernetes-specialist', 'devops-engineer'],
      'docker': ['devops-engineer', 'kubernetes-specialist'],
      'aws': ['cloud-architect', 'devops-engineer'],
      'azure': ['azure-infra-engineer', 'cloud-architect'],
      'postgres': ['sql-pro', 'postgres-pro', 'database-administrator'],
      'mysql': ['sql-pro', 'database-administrator'],
      'mongodb': ['database-administrator', 'backend-developer'],
      'graphql': ['graphql-architect', 'api-designer'],
      'rest': ['api-designer', 'backend-developer'],
      'security': ['security-auditor', 'penetration-tester'],
      'test': ['qa-expert', 'test-automator'],
      'deploy': ['devops-engineer', 'deployment-engineer'],
      'ci/cd': ['devops-engineer', 'build-engineer'],
      'ml': ['ml-engineer', 'data-scientist'],
      'ai': ['ai-engineer', 'ml-engineer', 'llm-architect'],
      'blockchain': ['blockchain-developer'],
      'solidity': ['blockchain-developer'],
      'game': ['game-developer'],
      'mobile': ['mobile-developer', 'flutter-expert'],
      'ios': ['swift-expert', 'mobile-developer'],
      'android': ['kotlin-specialist', 'mobile-developer']
    };

    for (const [keyword, agents] of Object.entries(techKeywords)) {
      map.set(keyword, { agents, weight: 0.9 });
    }

    return map;
  }

  /**
   * Main routing entry point
   * @param {string} task - Task description
   * @param {Object} options - Routing options
   * @returns {Object} Routing decision
   */
  route(task, options = {}) {
    const { preferredAgents = [], excludeAgents = [], context = {} } = options;

    // Step 1: Extract keywords from task
    const keywords = this.extractKeywords(task);

    // Step 2: Score agents based on keywords
    const scores = this.scoreAgents(keywords, preferredAgents, excludeAgents);

    // Step 3: Determine execution strategy
    const strategy = this.determineStrategy(task, scores, context);

    // Step 4: Select final agents
    const selectedAgents = this.selectAgents(scores, strategy);

    return {
      agents: selectedAgents,
      strategy,
      scores: Object.fromEntries(
        selectedAgents.map(a => [a.agent, a.score])
      ),
      keywords,
      confidence: selectedAgents.length > 0
        ? Math.max(...selectedAgents.map(a => a.score))
        : 0
    };
  }

  /**
   * Extract keywords from task description
   */
  extractKeywords(task) {
    const keywords = [];
    const normalized = task.toLowerCase();

    // Extract words
    const words = normalized.match(/\b[\w+#]+\b/g) || [];

    // Check against keyword map
    for (const word of words) {
      if (this.keywordMap.has(word)) {
        keywords.push({
          keyword: word,
          ...this.keywordMap.get(word)
        });
      }
    }

    // Check for compound keywords
    const compoundKeywords = [
      'ci/cd', 'react native', 'machine learning', 'artificial intelligence',
      'full stack', 'full-stack', 'front end', 'front-end', 'back end', 'back-end',
      'api design', 'database design', 'code review', 'security audit',
      'unit test', 'integration test', 'e2e test', 'performance test'
    ];

    for (const compound of compoundKeywords) {
      if (normalized.includes(compound)) {
        const key = compound.replace(/[\s-]/g, '').toLowerCase();
        if (this.keywordMap.has(key)) {
          keywords.push({
            keyword: compound,
            ...this.keywordMap.get(key)
          });
        }
      }
    }

    return keywords;
  }

  /**
   * Score agents based on keyword matches
   */
  scoreAgents(keywords, preferredAgents, excludeAgents) {
    const scores = new Map();

    // Initialize scores from keywords
    for (const { agents, weight } of keywords) {
      for (const agent of agents) {
        if (excludeAgents.includes(agent)) continue;

        const current = scores.get(agent) || 0;
        const boost = preferredAgents.includes(agent) ? 1.5 : 1.0;
        scores.set(agent, current + (weight * boost));
      }
    }

    // Add preferred agents with minimum score if not matched
    for (const agent of preferredAgents) {
      if (!scores.has(agent) && !excludeAgents.includes(agent)) {
        scores.set(agent, this.config.minConfidence);
      }
    }

    // Normalize scores
    const maxScore = Math.max(...scores.values(), 1);
    for (const [agent, score] of scores) {
      scores.set(agent, score / maxScore);
    }

    return scores;
  }

  /**
   * Determine execution strategy based on task analysis
   */
  determineStrategy(task, scores, context) {
    const normalized = task.toLowerCase();

    // Check for explicit strategy hints
    if (normalized.includes('in parallel') || normalized.includes('simultaneously')) {
      return 'parallel';
    }
    if (normalized.includes('in order') || normalized.includes('sequentially')) {
      return 'sequential';
    }
    if (normalized.includes('then') || normalized.includes('after')) {
      return 'sequential';
    }

    // Determine based on agent types
    const agentTypes = Array.from(scores.keys());

    // If mixing development and review, sequential
    const devAgents = ['backend-developer', 'frontend-developer', 'fullstack-developer'];
    const reviewAgents = ['code-reviewer', 'security-auditor', 'qa-expert'];

    const hasDev = agentTypes.some(a => devAgents.includes(a));
    const hasReview = agentTypes.some(a => reviewAgents.includes(a));

    if (hasDev && hasReview) {
      return 'sequential';
    }

    // Default to parallel for independent agents
    if (scores.size > 1) {
      return 'parallel';
    }

    return 'single';
  }

  /**
   * Select final agents based on scores and strategy
   */
  selectAgents(scores, strategy) {
    // Sort agents by score
    const sorted = Array.from(scores.entries())
      .map(([agent, score]) => ({ agent, score }))
      .filter(a => a.score >= this.config.minConfidence)
      .sort((a, b) => b.score - a.score);

    // Limit to max agents
    const selected = sorted.slice(0, this.config.maxAgents);

    // If no agents found, use default
    if (selected.length === 0) {
      selected.push({
        agent: this.config.defaultAgent,
        score: 0.5
      });
    }

    return selected;
  }

  /**
   * Get agent info by ID
   */
  getAgentInfo(agentId) {
    for (const category of Object.values(this.registry.categories)) {
      const agent = category.agents.find(a => a.id === agentId);
      if (agent) {
        return {
          ...agent,
          category: category.name
        };
      }
    }
    return null;
  }

  /**
   * Get all agents in a category
   */
  getAgentsByCategory(categoryId) {
    const category = this.registry.categories[categoryId];
    if (category) {
      return category.agents;
    }
    return [];
  }

  /**
   * Get all available agents
   */
  getAllAgents() {
    const agents = [];
    for (const [categoryId, category] of Object.entries(this.registry.categories)) {
      for (const agent of category.agents) {
        agents.push({
          ...agent,
          category: category.name,
          categoryId
        });
      }
    }
    return agents;
  }

  /**
   * Search agents by term
   */
  searchAgents(term) {
    const normalized = term.toLowerCase();
    return this.getAllAgents().filter(agent =>
      agent.id.toLowerCase().includes(normalized) ||
      (agent.description && agent.description.toLowerCase().includes(normalized))
    );
  }
}

module.exports = AgentRouter;
