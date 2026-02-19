import { type AdaptorCls, INJECT_META_KEY, InjectInfo } from "@akanjs/service";

interface AdaptorNode {
  key: string;
  adaptor: AdaptorCls;
  dependencies: string[];
}

export interface AdaptorHierarchy {
  graph: Map<string, AdaptorNode>;
  classToKey: Map<AdaptorCls, string>;
  /** Each stage contains adaptor map keys that can be initialized concurrently. Stages run sequentially. */
  stages: string[][];
}

/**
 * Recursively collects all AdaptorCls referenced via `plug` injections,
 * starting from the given sources (services, adaptors, or anything with INJECT_META_KEY).
 */
export function collectAdaptors(sources: { [INJECT_META_KEY]: Record<string, InjectInfo> }[]): Set<AdaptorCls> {
  const discovered = new Set<AdaptorCls>();

  function scan(injectMap: Record<string, InjectInfo>) {
    for (const injectInfo of Object.values(injectMap)) {
      if (injectInfo.type === "plug" && injectInfo.adaptor && !discovered.has(injectInfo.adaptor)) {
        discovered.add(injectInfo.adaptor);
        scan(injectInfo.adaptor[INJECT_META_KEY] ?? {});
      }
    }
  }

  for (const source of sources) {
    scan(source[INJECT_META_KEY] ?? {});
  }

  return discovered;
}

export function resolveAdaptorHierarchy(adaptorMap: Map<string, AdaptorCls>): AdaptorHierarchy {
  const classToKey = new Map<AdaptorCls, string>();
  for (const [key, adaptor] of adaptorMap) {
    classToKey.set(adaptor, key);
  }

  const graph = new Map<string, AdaptorNode>();

  for (const [key, adaptor] of adaptorMap) {
    const injectMap: Record<string, InjectInfo> = adaptor[INJECT_META_KEY] ?? {};
    const dependencies: string[] = [];

    for (const [propKey, injectInfo] of Object.entries(injectMap)) {
      if (injectInfo.type === "plug") {
        if (!injectInfo.adaptor) continue;
        const depKey = classToKey.get(injectInfo.adaptor);
        if (!depKey) {
          throw new Error(
            `Adaptor "${key}" has a plug dependency (property "${propKey}") ` +
              `on adaptor "${injectInfo.adaptor.refName}" which is not registered.`
          );
        }
        dependencies.push(depKey);
      } else if (injectInfo.type === "use") {
        if (adaptorMap.has(propKey) && propKey !== key) {
          dependencies.push(propKey);
        }
      }
    }

    graph.set(key, { key, adaptor, dependencies });
  }

  const stages = topologicalStages(graph);

  return { graph, classToKey, stages };
}

function topologicalStages(graph: Map<string, AdaptorNode>): string[][] {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const [refName, node] of graph) {
    inDegree.set(refName, node.dependencies.length);
    dependents.set(refName, []);
  }

  for (const [refName, node] of graph) {
    for (const dep of node.dependencies) {
      dependents.get(dep)!.push(refName);
    }
  }

  let queue: string[] = [];
  for (const [refName, degree] of inDegree) {
    if (degree === 0) queue.push(refName);
  }

  const stages: string[][] = [];
  let processed = 0;

  while (queue.length > 0) {
    stages.push(queue);
    processed += queue.length;

    const next: string[] = [];
    for (const refName of queue) {
      for (const dependent of dependents.get(refName)!) {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) next.push(dependent);
      }
    }
    queue = next;
  }

  if (processed !== graph.size) {
    const remaining = [...graph.keys()].filter((r) => inDegree.get(r)! > 0);
    const cycle = traceCycle(graph, remaining);
    throw new Error(`Circular adaptor dependency detected: ${cycle.join(" → ")}`);
  }

  return stages;
}

function traceCycle(graph: Map<string, AdaptorNode>, candidates: string[]): string[] {
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(refName: string): string[] | null {
    if (path.includes(refName)) {
      const cycleStart = path.indexOf(refName);
      return [...path.slice(cycleStart), refName];
    }
    if (visited.has(refName)) return null;
    visited.add(refName);
    path.push(refName);

    const node = graph.get(refName);
    if (node) {
      for (const dep of node.dependencies) {
        const cycle = dfs(dep);
        if (cycle) return cycle;
      }
    }

    path.pop();
    return null;
  }

  for (const refName of candidates) {
    const cycle = dfs(refName);
    if (cycle) return cycle;
  }

  return candidates;
}
