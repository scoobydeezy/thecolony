import { Injectable } from '@angular/core';
import * as dagre from 'dagre';
import { NarrativeEvent, NarrativeEventConnection } from '../../../core/models/types';

export interface NodePos { x: number; y: number; }
export const NODE_W = 220;
export const NODE_H = 96;

/**
 * Wraps dagre layout computation and clear-position collision resolution.
 * Stateless — callers own the livePos map.
 */
@Injectable({ providedIn: 'root' })
export class NarrativeFlowLayoutService {

  computeDagre(
    unplaced: NarrativeEvent[],
    connections: NarrativeEventConnection[],
  ): Map<string, NodePos> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 60 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const ev of unplaced) g.setNode(ev.id, { width: NODE_W, height: NODE_H });

    const ids = new Set(unplaced.map(e => e.id));
    for (const c of connections) {
      if (ids.has(c.sourceNarrativeEventId) && ids.has(c.targetNarrativeEventId))
        g.setEdge(c.sourceNarrativeEventId, c.targetNarrativeEventId);
    }

    dagre.layout(g);

    const result = new Map<string, NodePos>();
    for (const ev of unplaced) {
      const n = g.node(ev.id);
      if (n) result.set(ev.id, { x: n.x - NODE_W / 2, y: n.y - NODE_H / 2 });
    }
    return result;
  }

  findClearPosition(candidate: NodePos, existingPositions: Iterable<NodePos>): NodePos {
    const PAD = 20;
    const W   = NODE_W + PAD;
    const H   = NODE_H + PAD;
    let { x, y } = candidate;
    let attempts = 0;
    const positions = Array.from(existingPositions);
    while (attempts < 200) {
      const clash = positions.some(p => Math.abs(p.x - x) < W && Math.abs(p.y - y) < H);
      if (!clash) return { x, y };
      x += W;
      if (x > candidate.x + W * 5) { x = candidate.x; y += H; }
      attempts++;
    }
    return { x, y };
  }

  /**
   * Builds a temporary condensed layout for a filtered subset of events.
   * Ranks events topologically (left-to-right columns); events sharing the same
   * upstream parent are placed in the same column, stacked top-to-bottom.
   * Returns only positions for the filtered IDs — original livePos is untouched.
   */
  computeCondensed(
    filteredIds: Set<string>,
    allConnections: NarrativeEventConnection[],
  ): Map<string, NodePos> {
    const COL_GAP = 60;
    const ROW_GAP = 24;
    const PAD     = 60;

    const edges = allConnections.filter(
      c => filteredIds.has(c.sourceNarrativeEventId) && filteredIds.has(c.targetNarrativeEventId),
    );

    const children = new Map<string, string[]>();
    const parents  = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const id of filteredIds) {
      children.set(id, []);
      parents.set(id,  []);
      inDegree.set(id, 0);
    }
    for (const e of edges) {
      children.get(e.sourceNarrativeEventId)!.push(e.targetNarrativeEventId);
      parents.get(e.targetNarrativeEventId)!.push(e.sourceNarrativeEventId);
      inDegree.set(e.targetNarrativeEventId, (inDegree.get(e.targetNarrativeEventId) ?? 0) + 1);
    }

    // Kahn's BFS — assign topological ranks level by level
    const ranks = new Map<string, number>();
    let queue = [...filteredIds].filter(id => inDegree.get(id) === 0);
    let rank  = 0;

    while (queue.length > 0) {
      const next: string[] = [];
      for (const id of queue) {
        ranks.set(id, rank);
        for (const child of children.get(id)!) {
          const deg = inDegree.get(child)! - 1;
          inDegree.set(child, deg);
          if (deg === 0) next.push(child);
        }
      }
      queue = next;
      rank++;
    }

    // Fallback rank for any cycle members not reached
    for (const id of filteredIds) {
      if (!ranks.has(id)) ranks.set(id, 0);
    }

    // Group by rank, then sort within each rank so siblings (same parent) are adjacent
    const rankGroups = new Map<number, string[]>();
    for (const [id, r] of ranks) {
      const list = rankGroups.get(r) ?? [];
      list.push(id);
      rankGroups.set(r, list);
    }

    for (const list of rankGroups.values()) {
      list.sort((a, b) => {
        const pa = (parents.get(a) ?? []).slice().sort().join('\0');
        const pb = (parents.get(b) ?? []).slice().sort().join('\0');
        return pa < pb ? -1 : pa > pb ? 1 : 0;
      });
    }

    // Assign positions: rank → x column, position-in-rank → y row
    const result = new Map<string, NodePos>();
    for (const [r, list] of rankGroups) {
      const x = PAD + r * (NODE_W + COL_GAP);
      list.forEach((id, i) => {
        result.set(id, { x, y: PAD + i * (NODE_H + ROW_GAP) });
      });
    }
    return result;
  }

  fitViewTransform(
    livePos: Map<string, NodePos>,
    events: NarrativeEvent[],
    viewW: number,
    viewH: number,
  ): { tx: number; ty: number; scale: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ev of events) {
      const p = livePos.get(ev.id);
      if (!p) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    if (!isFinite(minX)) return null;

    const PAD   = 60;
    const bW    = maxX - minX + PAD * 2;
    const bH    = maxY - minY + PAD * 2;
    const scale = Math.min(viewW / bW, viewH / bH, 1);
    return {
      tx:    (viewW - bW * scale) / 2 - (minX - PAD) * scale,
      ty:    (viewH - bH * scale) / 2 - (minY - PAD) * scale,
      scale,
    };
  }
}
