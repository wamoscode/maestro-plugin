/**
 * Cross-Project Intelligence Skill
 *
 * Provides intelligent analysis and coordination features for
 * multi-project workspaces, including dependency graphs, unified
 * progress tracking, and release coordination.
 */

class CrossProjectIntelligence {
  constructor(config = {}) {
    this.config = {
      workspaceRoot: config.workspaceRoot || 'maestro',
      graphOutputFormat: config.graphOutputFormat || 'mermaid',
      ...config
    };

    this.projects = new Map();
    this.dependencies = new Map();
    this.crossProjectTracks = [];
  }

  /**
   * Load workspace and project data
   * @param {Object} workspace - Workspace configuration
   */
  loadWorkspace(workspace) {
    this.workspace = workspace;

    for (const project of workspace.projects || []) {
      this.projects.set(project.id, {
        ...project,
        tracks: [],
        dependencies: []
      });
    }
  }

  /**
   * Build dependency graph for all projects
   * @returns {Object} Dependency graph
   */
  buildDependencyGraph() {
    const graph = {
      nodes: [],
      edges: [],
      levels: new Map()
    };

    // Add project nodes
    for (const [id, project] of this.projects) {
      graph.nodes.push({
        id,
        type: 'project',
        name: project.name,
        path: project.path,
        isSubmodule: project.type === 'submodule'
      });
    }

    // Add dependency edges
    for (const [id, project] of this.projects) {
      for (const dep of project.dependencies || []) {
        graph.edges.push({
          from: id,
          to: dep,
          type: 'depends_on'
        });
      }
    }

    // Calculate levels (topological sort)
    graph.levels = this.calculateLevels(graph);

    return graph;
  }

  /**
   * Visualize dependency graph as Mermaid diagram
   * @param {Object} graph - Dependency graph
   * @returns {string} Mermaid diagram code
   */
  visualizeDependencyGraph(graph) {
    let mermaid = 'graph TB\n';
    mermaid += '  subgraph Workspace\n';

    // Add nodes
    for (const node of graph.nodes) {
      const shape = node.isSubmodule ? '{{' : '[';
      const shapeEnd = node.isSubmodule ? '}}' : ']';
      mermaid += `    ${node.id}${shape}"${node.name}"${shapeEnd}\n`;
    }

    mermaid += '  end\n';

    // Add edges
    for (const edge of graph.edges) {
      mermaid += `  ${edge.from} --> ${edge.to}\n`;
    }

    return mermaid;
  }

  /**
   * Analyze cross-project impact
   * @param {Object} change - Proposed change
   * @returns {Object} Impact analysis
   */
  analyzeCrossProjectImpact(change) {
    const impact = {
      sourceProject: change.project,
      affectedProjects: [],
      propagationPath: [],
      riskLevel: 'low',
      recommendations: []
    };

    const graph = this.buildDependencyGraph();

    // Find projects that depend on source project
    const affected = this.findDependents(change.project, graph);

    for (const projectId of affected) {
      const project = this.projects.get(projectId);
      impact.affectedProjects.push({
        id: projectId,
        name: project.name,
        type: project.type,
        impactType: this.assessImpactType(change, project)
      });
    }

    // Calculate propagation path
    impact.propagationPath = this.calculatePropagationPath(change.project, graph);

    // Assess risk
    impact.riskLevel = this.assessCrossProjectRisk(impact);

    // Generate recommendations
    impact.recommendations = this.generateCrossProjectRecommendations(impact, change);

    return impact;
  }

  /**
   * Get unified workspace progress
   * @returns {Object} Workspace progress
   */
  getWorkspaceProgress() {
    const progress = {
      overall: {
        totalTracks: 0,
        completedTracks: 0,
        activeTracks: 0,
        totalTasks: 0,
        completedTasks: 0,
        progressPercentage: 0
      },
      byProject: {},
      crossProjectTracks: [],
      blockers: [],
      recentActivity: []
    };

    // Aggregate by project
    for (const [projectId, project] of this.projects) {
      const projectProgress = {
        name: project.name,
        tracks: {
          total: 0,
          completed: 0,
          active: 0,
          stashed: 0
        },
        tasks: {
          total: 0,
          completed: 0
        },
        progressPercentage: 0
      };

      for (const track of project.tracks || []) {
        projectProgress.tracks.total++;
        progress.overall.totalTracks++;

        if (track.status === 'completed') {
          projectProgress.tracks.completed++;
          progress.overall.completedTracks++;
        } else if (track.status === 'active' || track.status === 'in_progress') {
          projectProgress.tracks.active++;
          progress.overall.activeTracks++;
        }

        projectProgress.tasks.total += track.tasks?.total || 0;
        projectProgress.tasks.completed += track.tasks?.completed || 0;
        progress.overall.totalTasks += track.tasks?.total || 0;
        progress.overall.completedTasks += track.tasks?.completed || 0;

        // Collect blockers
        if (track.blockers?.length > 0) {
          progress.blockers.push({
            projectId,
            trackId: track.id,
            blockers: track.blockers
          });
        }
      }

      projectProgress.progressPercentage = projectProgress.tasks.total > 0
        ? Math.round((projectProgress.tasks.completed / projectProgress.tasks.total) * 100)
        : 0;

      progress.byProject[projectId] = projectProgress;
    }

    // Overall percentage
    progress.overall.progressPercentage = progress.overall.totalTasks > 0
      ? Math.round((progress.overall.completedTasks / progress.overall.totalTasks) * 100)
      : 0;

    // Get cross-project tracks
    progress.crossProjectTracks = this.crossProjectTracks.map(track => ({
      id: track.id,
      title: track.title,
      projects: track.scope.projects,
      status: track.status,
      progress: this.calculateCrossProjectTrackProgress(track)
    }));

    return progress;
  }

  /**
   * Generate unified changelog for workspace
   * @param {Object} options - Changelog options
   * @returns {Object} Unified changelog
   */
  generateUnifiedChangelog(options = {}) {
    const changelog = {
      version: options.version || 'next',
      date: new Date().toISOString().split('T')[0],
      projects: {},
      crossProject: [],
      summary: {
        features: 0,
        bugs: 0,
        chores: 0,
        refactors: 0
      }
    };

    // Collect changes by project
    for (const [projectId, project] of this.projects) {
      const projectChanges = {
        name: project.name,
        features: [],
        bugs: [],
        chores: [],
        refactors: []
      };

      for (const track of project.tracks || []) {
        if (track.status === 'completed' && this.isInVersion(track, options)) {
          const entry = {
            id: track.id,
            title: track.title,
            description: track.spec?.overview || ''
          };

          switch (track.type) {
            case 'feature':
              projectChanges.features.push(entry);
              changelog.summary.features++;
              break;
            case 'bug':
              projectChanges.bugs.push(entry);
              changelog.summary.bugs++;
              break;
            case 'chore':
              projectChanges.chores.push(entry);
              changelog.summary.chores++;
              break;
            case 'refactor':
              projectChanges.refactors.push(entry);
              changelog.summary.refactors++;
              break;
          }
        }
      }

      if (this.hasChanges(projectChanges)) {
        changelog.projects[projectId] = projectChanges;
      }
    }

    // Collect cross-project changes
    for (const track of this.crossProjectTracks) {
      if (track.status === 'completed' && this.isInVersion(track, options)) {
        changelog.crossProject.push({
          id: track.id,
          title: track.title,
          projects: track.scope.projects,
          type: track.type
        });
      }
    }

    return changelog;
  }

  /**
   * Format changelog as markdown
   * @param {Object} changelog - Changelog data
   * @returns {string} Markdown formatted changelog
   */
  formatChangelogMarkdown(changelog) {
    let md = `# Changelog - ${changelog.version}\n\n`;
    md += `**Date**: ${changelog.date}\n\n`;

    md += `## Summary\n\n`;
    md += `- Features: ${changelog.summary.features}\n`;
    md += `- Bug Fixes: ${changelog.summary.bugs}\n`;
    md += `- Chores: ${changelog.summary.chores}\n`;
    md += `- Refactors: ${changelog.summary.refactors}\n\n`;

    if (changelog.crossProject.length > 0) {
      md += `## Cross-Project Changes\n\n`;
      for (const change of changelog.crossProject) {
        md += `- **${change.title}** (${change.projects.join(', ')})\n`;
      }
      md += '\n';
    }

    for (const [projectId, changes] of Object.entries(changelog.projects)) {
      md += `## ${changes.name}\n\n`;

      if (changes.features.length > 0) {
        md += `### Features\n\n`;
        for (const f of changes.features) {
          md += `- ${f.title}\n`;
        }
        md += '\n';
      }

      if (changes.bugs.length > 0) {
        md += `### Bug Fixes\n\n`;
        for (const b of changes.bugs) {
          md += `- ${b.title}\n`;
        }
        md += '\n';
      }

      if (changes.chores.length > 0) {
        md += `### Maintenance\n\n`;
        for (const c of changes.chores) {
          md += `- ${c.title}\n`;
        }
        md += '\n';
      }

      if (changes.refactors.length > 0) {
        md += `### Refactoring\n\n`;
        for (const r of changes.refactors) {
          md += `- ${r.title}\n`;
        }
        md += '\n';
      }
    }

    return md;
  }

  /**
   * Coordinate release across projects
   * @param {Object} releaseConfig - Release configuration
   * @returns {Object} Release plan
   */
  coordinateRelease(releaseConfig) {
    const plan = {
      version: releaseConfig.version,
      projects: [],
      order: [],
      steps: [],
      warnings: []
    };

    const graph = this.buildDependencyGraph();

    // Determine order based on dependencies
    plan.order = this.getTopologicalOrder(graph);

    // Build steps for each project
    for (const projectId of plan.order) {
      const project = this.projects.get(projectId);
      const steps = this.getProjectReleaseSteps(project, releaseConfig);
      plan.projects.push({
        id: projectId,
        name: project.name,
        steps
      });
    }

    // Check for incomplete tracks
    for (const [projectId, project] of this.projects) {
      const incomplete = (project.tracks || []).filter(t =>
        t.status !== 'completed' && t.status !== 'stashed'
      );
      if (incomplete.length > 0) {
        plan.warnings.push({
          type: 'incomplete_tracks',
          projectId,
          count: incomplete.length,
          tracks: incomplete.map(t => t.id)
        });
      }
    }

    return plan;
  }

  /**
   * Get submodule coordination status
   * @returns {Object} Submodule status
   */
  getSubmoduleStatus() {
    const status = {
      submodules: [],
      needsSync: [],
      diverged: [],
      healthy: true
    };

    for (const [id, project] of this.projects) {
      if (project.type === 'submodule') {
        const submoduleInfo = {
          id,
          name: project.name,
          path: project.path,
          currentCommit: project.currentCommit,
          trackedCommit: project.trackedCommit,
          status: 'synced'
        };

        if (project.currentCommit !== project.trackedCommit) {
          submoduleInfo.status = 'out_of_sync';
          status.needsSync.push(id);
          status.healthy = false;
        }

        if (project.hasDiverged) {
          submoduleInfo.status = 'diverged';
          status.diverged.push(id);
          status.healthy = false;
        }

        status.submodules.push(submoduleInfo);
      }
    }

    return status;
  }

  // Helper methods
  calculateLevels(graph) {
    const levels = new Map();
    const inDegree = new Map();

    // Initialize
    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
      levels.set(node.id, 0);
    }

    // Calculate in-degree
    for (const edge of graph.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // BFS to assign levels
    const queue = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const currentLevel = levels.get(current);

      for (const edge of graph.edges) {
        if (edge.from === current) {
          const newLevel = currentLevel + 1;
          if (newLevel > levels.get(edge.to)) {
            levels.set(edge.to, newLevel);
          }
          inDegree.set(edge.to, inDegree.get(edge.to) - 1);
          if (inDegree.get(edge.to) === 0) {
            queue.push(edge.to);
          }
        }
      }
    }

    return levels;
  }

  findDependents(projectId, graph) {
    const dependents = new Set();
    const queue = [projectId];

    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of graph.edges) {
        if (edge.to === current && !dependents.has(edge.from)) {
          dependents.add(edge.from);
          queue.push(edge.from);
        }
      }
    }

    return [...dependents];
  }

  calculatePropagationPath(projectId, graph) {
    const path = [];
    const visited = new Set();
    const queue = [[projectId]];

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const current = currentPath[currentPath.length - 1];

      if (visited.has(current)) continue;
      visited.add(current);

      for (const edge of graph.edges) {
        if (edge.to === current) {
          const newPath = [...currentPath, edge.from];
          path.push(newPath);
          queue.push(newPath);
        }
      }
    }

    return path;
  }

  assessImpactType(change, project) {
    if (change.type === 'breaking') return 'breaking';
    if (change.files?.some(f => f.includes('/api/') || f.includes('/shared/'))) {
      return 'interface';
    }
    return 'internal';
  }

  assessCrossProjectRisk(impact) {
    if (impact.affectedProjects.some(p => p.impactType === 'breaking')) return 'critical';
    if (impact.affectedProjects.length > 3) return 'high';
    if (impact.affectedProjects.some(p => p.impactType === 'interface')) return 'medium';
    return 'low';
  }

  generateCrossProjectRecommendations(impact, change) {
    const recommendations = [];

    if (impact.riskLevel === 'critical' || impact.riskLevel === 'high') {
      recommendations.push({
        priority: 1,
        action: 'Coordinate with all affected project owners before implementation'
      });
      recommendations.push({
        priority: 1,
        action: 'Create cross-project track to manage the change'
      });
    }

    if (impact.affectedProjects.some(p => p.impactType === 'breaking')) {
      recommendations.push({
        priority: 1,
        action: 'Version the change and provide migration path'
      });
    }

    recommendations.push({
      priority: 2,
      action: 'Run integration tests across all affected projects'
    });

    return recommendations;
  }

  calculateCrossProjectTrackProgress(track) {
    let totalTasks = 0;
    let completedTasks = 0;

    for (const projectTasks of Object.values(track.tasks?.perProject || {})) {
      totalTasks += projectTasks.total || 0;
      completedTasks += projectTasks.completed || 0;
    }

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  isInVersion(track, options) {
    if (!options.since) return true;
    return new Date(track.updated) >= new Date(options.since);
  }

  hasChanges(projectChanges) {
    return projectChanges.features.length > 0 ||
      projectChanges.bugs.length > 0 ||
      projectChanges.chores.length > 0 ||
      projectChanges.refactors.length > 0;
  }

  getTopologicalOrder(graph) {
    const order = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (nodeId) => {
      if (temp.has(nodeId)) throw new Error('Circular dependency detected');
      if (visited.has(nodeId)) return;

      temp.add(nodeId);

      for (const edge of graph.edges) {
        if (edge.from === nodeId) {
          visit(edge.to);
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      order.unshift(nodeId);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return order;
  }

  getProjectReleaseSteps(project, config) {
    const steps = [];

    if (project.type === 'submodule') {
      steps.push({
        action: 'checkout',
        description: `Checkout submodule ${project.name}`,
        command: `cd ${project.path} && git checkout ${config.branch || 'main'}`
      });
    }

    steps.push({
      action: 'version',
      description: 'Update version number',
      command: `npm version ${config.version}`
    });

    steps.push({
      action: 'build',
      description: 'Build project',
      command: project.buildCommand || 'npm run build'
    });

    steps.push({
      action: 'test',
      description: 'Run tests',
      command: project.testCommand || 'npm test'
    });

    if (project.type === 'submodule') {
      steps.push({
        action: 'commit',
        description: 'Commit submodule changes',
        command: `cd ${project.path} && git add . && git commit -m "Release ${config.version}"`
      });
    }

    return steps;
  }
}

module.exports = CrossProjectIntelligence;
