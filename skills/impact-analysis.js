/**
 * Impact Analysis Skill
 *
 * Analyzes the potential impact of track changes on the codebase,
 * provides risk assessment, and visualizes blast radius.
 */

class ImpactAnalysis {
  constructor(config = {}) {
    this.config = {
      riskWeights: {
        coreModule: 3,
        sharedUtility: 2.5,
        publicApi: 2.5,
        securityRelated: 3,
        databaseSchema: 2.5,
        configuration: 2,
        testFile: 0.5,
        documentation: 0.3,
        ...config.riskWeights
      },
      ...config
    };
  }

  /**
   * Analyze impact of a track's planned changes
   * @param {Object} track - Track with spec and plan
   * @param {Object} codebase - Codebase analysis context
   * @returns {Object} Impact analysis result
   */
  analyzeTrackImpact(track, codebase = {}) {
    const affectedAreas = this.extractAffectedAreas(track);
    const dependencies = this.analyzeDependencies(affectedAreas, codebase);
    const riskFactors = this.assessRiskFactors(affectedAreas, dependencies);
    const blastRadius = this.calculateBlastRadius(affectedAreas, dependencies);

    return {
      trackId: track.id,
      analyzedAt: new Date().toISOString(),
      summary: {
        totalFilesAffected: affectedAreas.files.length,
        totalDependencies: dependencies.length,
        riskLevel: this.calculateRiskLevel(riskFactors),
        blastRadiusScore: blastRadius.score
      },
      affectedAreas,
      dependencies,
      riskFactors,
      blastRadius,
      recommendations: this.generateRecommendations(riskFactors, blastRadius),
      testingStrategy: this.suggestTestingStrategy(riskFactors, blastRadius)
    };
  }

  /**
   * Extract affected areas from track spec and plan
   * @param {Object} track - Track data
   * @returns {Object} Affected areas
   */
  extractAffectedAreas(track) {
    const areas = {
      files: [],
      modules: [],
      components: [],
      apis: [],
      database: [],
      configuration: []
    };

    // Parse from spec's affected areas section
    if (track.spec && track.spec.affectedAreas) {
      for (const area of track.spec.affectedAreas) {
        const category = this.categorizeArea(area.path);
        areas[category].push({
          path: area.path,
          description: area.description,
          changeType: area.changeType || 'modify'
        });
        areas.files.push(area.path);
      }
    }

    // Parse from plan's tasks
    if (track.plan && track.plan.phases) {
      for (const phase of track.plan.phases) {
        for (const task of phase.tasks || []) {
          if (task.files) {
            for (const file of task.files) {
              if (!areas.files.includes(file)) {
                areas.files.push(file);
                const category = this.categorizeArea(file);
                areas[category].push({
                  path: file,
                  description: task.description,
                  changeType: task.type || 'modify'
                });
              }
            }
          }
        }
      }
    }

    return areas;
  }

  /**
   * Analyze dependencies of affected files
   * @param {Object} affectedAreas - Areas being modified
   * @param {Object} codebase - Codebase analysis
   * @returns {Array} Dependencies
   */
  analyzeDependencies(affectedAreas, codebase) {
    const dependencies = [];

    for (const file of affectedAreas.files) {
      // Files that import this file
      const importedBy = this.findImporters(file, codebase);
      for (const importer of importedBy) {
        dependencies.push({
          source: file,
          target: importer,
          type: 'imported_by',
          impact: 'direct'
        });
      }

      // Files this file imports
      const imports = this.findImports(file, codebase);
      for (const imported of imports) {
        dependencies.push({
          source: file,
          target: imported,
          type: 'imports',
          impact: 'indirect'
        });
      }
    }

    // Find transitive dependencies (second-level)
    const directDeps = dependencies.filter(d => d.impact === 'direct');
    for (const dep of directDeps) {
      const transitive = this.findImporters(dep.target, codebase);
      for (const trans of transitive) {
        if (!affectedAreas.files.includes(trans)) {
          dependencies.push({
            source: dep.target,
            target: trans,
            type: 'transitive',
            impact: 'indirect',
            via: dep.source
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Assess risk factors for the changes
   * @param {Object} affectedAreas - Affected areas
   * @param {Array} dependencies - Dependencies
   * @returns {Array} Risk factors
   */
  assessRiskFactors(affectedAreas, dependencies) {
    const risks = [];

    // Core module changes
    const coreChanges = affectedAreas.files.filter(f =>
      f.includes('/core/') || f.includes('/lib/') || f.includes('/shared/')
    );
    if (coreChanges.length > 0) {
      risks.push({
        id: 'core_changes',
        severity: 'high',
        score: coreChanges.length * this.config.riskWeights.coreModule,
        description: `Changes to ${coreChanges.length} core module(s)`,
        files: coreChanges,
        mitigation: 'Ensure comprehensive test coverage and code review'
      });
    }

    // Public API changes
    const apiChanges = affectedAreas.apis.length;
    if (apiChanges > 0) {
      risks.push({
        id: 'api_changes',
        severity: 'high',
        score: apiChanges * this.config.riskWeights.publicApi,
        description: `${apiChanges} public API endpoint(s) affected`,
        files: affectedAreas.apis.map(a => a.path),
        mitigation: 'Verify backward compatibility, update API documentation'
      });
    }

    // Database schema changes
    const dbChanges = affectedAreas.database.length;
    if (dbChanges > 0) {
      risks.push({
        id: 'database_changes',
        severity: 'high',
        score: dbChanges * this.config.riskWeights.databaseSchema,
        description: `${dbChanges} database change(s) required`,
        files: affectedAreas.database.map(d => d.path),
        mitigation: 'Create migration scripts, plan rollback strategy'
      });
    }

    // Security-related files
    const securityFiles = affectedAreas.files.filter(f =>
      f.includes('auth') || f.includes('security') ||
      f.includes('permission') || f.includes('encrypt')
    );
    if (securityFiles.length > 0) {
      risks.push({
        id: 'security_changes',
        severity: 'critical',
        score: securityFiles.length * this.config.riskWeights.securityRelated,
        description: `${securityFiles.length} security-related file(s) affected`,
        files: securityFiles,
        mitigation: 'Security review required, consider penetration testing'
      });
    }

    // High dependency count
    const directDeps = dependencies.filter(d => d.type === 'imported_by');
    if (directDeps.length > 10) {
      risks.push({
        id: 'high_dependencies',
        severity: 'medium',
        score: Math.log2(directDeps.length) * 2,
        description: `${directDeps.length} files depend on changed code`,
        mitigation: 'Thorough regression testing recommended'
      });
    }

    // Configuration changes
    const configChanges = affectedAreas.configuration.length;
    if (configChanges > 0) {
      risks.push({
        id: 'config_changes',
        severity: 'medium',
        score: configChanges * this.config.riskWeights.configuration,
        description: `${configChanges} configuration file(s) affected`,
        files: affectedAreas.configuration.map(c => c.path),
        mitigation: 'Verify environment-specific configurations'
      });
    }

    return risks;
  }

  /**
   * Calculate blast radius visualization data
   * @param {Object} affectedAreas - Affected areas
   * @param {Array} dependencies - Dependencies
   * @returns {Object} Blast radius data
   */
  calculateBlastRadius(affectedAreas, dependencies) {
    const layers = {
      core: [], // Directly modified files
      direct: [], // Files that import modified files
      indirect: [], // Files that import direct dependencies
      isolated: [] // Modified files with no dependents
    };

    // Core layer - files being modified
    layers.core = affectedAreas.files.map(f => ({
      path: f,
      layer: 0
    }));

    // Direct layer
    const directDeps = dependencies.filter(d => d.type === 'imported_by');
    layers.direct = [...new Set(directDeps.map(d => d.target))]
      .filter(f => !affectedAreas.files.includes(f))
      .map(f => ({ path: f, layer: 1 }));

    // Indirect layer
    const transitiveDeps = dependencies.filter(d => d.type === 'transitive');
    layers.indirect = [...new Set(transitiveDeps.map(d => d.target))]
      .filter(f => !affectedAreas.files.includes(f) && !layers.direct.find(d => d.path === f))
      .map(f => ({ path: f, layer: 2 }));

    // Isolated (modified but no dependents)
    layers.isolated = affectedAreas.files
      .filter(f => !directDeps.find(d => d.source === f))
      .map(f => ({ path: f, layer: 0, isolated: true }));

    // Calculate score (higher = larger blast radius)
    const score = (
      layers.core.length * 1 +
      layers.direct.length * 0.5 +
      layers.indirect.length * 0.25
    );

    return {
      layers,
      score,
      totalAffected: layers.core.length + layers.direct.length + layers.indirect.length,
      visualization: this.generateMermaidDiagram(layers, dependencies)
    };
  }

  /**
   * Calculate overall risk level
   * @param {Array} riskFactors - Risk factors
   * @returns {string} Risk level
   */
  calculateRiskLevel(riskFactors) {
    const totalScore = riskFactors.reduce((sum, r) => sum + r.score, 0);
    const hasCritical = riskFactors.some(r => r.severity === 'critical');
    const highCount = riskFactors.filter(r => r.severity === 'high').length;

    if (hasCritical || totalScore > 20) return 'critical';
    if (highCount >= 2 || totalScore > 10) return 'high';
    if (totalScore > 5) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on analysis
   * @param {Array} riskFactors - Risk factors
   * @param {Object} blastRadius - Blast radius data
   * @returns {Array} Recommendations
   */
  generateRecommendations(riskFactors, blastRadius) {
    const recommendations = [];

    // Risk-based recommendations
    for (const risk of riskFactors) {
      if (risk.severity === 'critical' || risk.severity === 'high') {
        recommendations.push({
          priority: risk.severity === 'critical' ? 1 : 2,
          type: 'risk_mitigation',
          riskId: risk.id,
          action: risk.mitigation
        });
      }
    }

    // Blast radius recommendations
    if (blastRadius.score > 10) {
      recommendations.push({
        priority: 2,
        type: 'testing',
        action: 'Implement comprehensive regression test suite due to large blast radius'
      });
    }

    if (blastRadius.layers.direct.length > 5) {
      recommendations.push({
        priority: 2,
        type: 'review',
        action: 'Consider phased rollout to limit impact of potential issues'
      });
    }

    // General recommendations
    recommendations.push({
      priority: 3,
      type: 'process',
      action: 'Document all changes in track progress log'
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Suggest testing strategy based on impact
   * @param {Array} riskFactors - Risk factors
   * @param {Object} blastRadius - Blast radius data
   * @returns {Object} Testing strategy
   */
  suggestTestingStrategy(riskFactors, blastRadius) {
    const strategy = {
      unitTests: {
        required: true,
        coverage: 80,
        focus: []
      },
      integrationTests: {
        required: blastRadius.layers.direct.length > 0,
        focus: []
      },
      e2eTests: {
        required: blastRadius.score > 5,
        focus: []
      },
      securityTests: {
        required: riskFactors.some(r => r.id === 'security_changes'),
        focus: []
      },
      performanceTests: {
        required: riskFactors.some(r => r.id === 'core_changes'),
        focus: []
      },
      manualTests: {
        required: false,
        focus: []
      }
    };

    // Add focus areas
    for (const risk of riskFactors) {
      if (risk.files) {
        if (risk.id === 'security_changes') {
          strategy.securityTests.focus.push(...risk.files);
        } else if (risk.id === 'api_changes') {
          strategy.integrationTests.focus.push(...risk.files);
        } else if (risk.id === 'database_changes') {
          strategy.integrationTests.focus.push(...risk.files);
          strategy.manualTests.required = true;
          strategy.manualTests.focus.push('Database migration verification');
        }
      }
    }

    return strategy;
  }

  /**
   * Generate Mermaid diagram for visualization
   * @param {Object} layers - Blast radius layers
   * @param {Array} dependencies - Dependencies
   * @returns {string} Mermaid diagram code
   */
  generateMermaidDiagram(layers, dependencies) {
    let diagram = 'graph LR\n';
    diagram += '  subgraph "Core Changes"\n';
    for (const file of layers.core) {
      const id = this.sanitizeId(file.path);
      diagram += `    ${id}["${this.shortPath(file.path)}"]\n`;
    }
    diagram += '  end\n';

    if (layers.direct.length > 0) {
      diagram += '  subgraph "Direct Dependencies"\n';
      for (const file of layers.direct.slice(0, 10)) {
        const id = this.sanitizeId(file.path);
        diagram += `    ${id}["${this.shortPath(file.path)}"]\n`;
      }
      if (layers.direct.length > 10) {
        diagram += `    more_direct["...+${layers.direct.length - 10} more"]\n`;
      }
      diagram += '  end\n';
    }

    if (layers.indirect.length > 0) {
      diagram += '  subgraph "Indirect Dependencies"\n';
      for (const file of layers.indirect.slice(0, 5)) {
        const id = this.sanitizeId(file.path);
        diagram += `    ${id}["${this.shortPath(file.path)}"]\n`;
      }
      if (layers.indirect.length > 5) {
        diagram += `    more_indirect["...+${layers.indirect.length - 5} more"]\n`;
      }
      diagram += '  end\n';
    }

    // Add connections
    for (const dep of dependencies.slice(0, 20)) {
      const sourceId = this.sanitizeId(dep.source);
      const targetId = this.sanitizeId(dep.target);
      diagram += `  ${sourceId} --> ${targetId}\n`;
    }

    return diagram;
  }

  // Helper methods
  categorizeArea(path) {
    if (path.includes('/api/') || path.includes('/routes/') || path.includes('/endpoints/')) {
      return 'apis';
    }
    if (path.includes('/models/') || path.includes('/schema/') || path.includes('/migrations/')) {
      return 'database';
    }
    if (path.includes('/config/') || path.endsWith('.config.js') || path.endsWith('.config.ts')) {
      return 'configuration';
    }
    if (path.includes('/components/') || path.includes('/views/') || path.includes('/pages/')) {
      return 'components';
    }
    return 'modules';
  }

  findImporters(file, codebase) {
    // Would analyze actual codebase imports
    return [];
  }

  findImports(file, codebase) {
    // Would analyze actual file imports
    return [];
  }

  sanitizeId(path) {
    return path.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  }

  shortPath(path) {
    const parts = path.split('/');
    return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : path;
  }
}

module.exports = ImpactAnalysis;
