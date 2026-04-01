import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode.jsx';
import { getLayoutedElements } from './layoutUtils.js';
import useProjectStore from '../../store/projectStore.js';

const nodeTypes = { custom: CustomNode };

function convertToFlowNodes(apiNodes = []) {
  return apiNodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.label,
      type: node.type,
      status: node.status,
      summary: node.summary,
      detail: node.detail,
      nodeId: node.id,
    },
  }));
}

function convertToFlowEdges(apiEdges = []) {
  return apiEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    // 'default' = BezierEdge — smooth S-curves, cross less than straight lines
    type: 'default',
    style: { stroke: '#4b5563', strokeWidth: 1.5 },
    labelStyle: { fill: '#9ca3af', fontSize: 10 },
  }));
}

function KnowledgeTreeInner({ tree }) {
  const selectNode  = useProjectStore((s) => s.selectNode);
  const deselectNode = useProjectStore((s) => s.deselectNode);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const { fitView } = useReactFlow();
  const prevTreeRef = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Re-layout only when the tree data changes
  useEffect(() => {
    if (!tree || tree === prevTreeRef.current) return;
    prevTreeRef.current = tree;

    const rawNodes = convertToFlowNodes(tree?.nodes);
    const rawEdges = convertToFlowEdges(tree?.edges);
    const { nodes: ln, edges: le } = getLayoutedElements(rawNodes, rawEdges);
    setNodes(ln);
    setEdges(le);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [tree, setNodes, setEdges, fitView]);

  // Compute selection context: which nodes/edges are connected to the selected node
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!selectedNodeId) return { connectedNodeIds: new Set(), connectedEdgeIds: new Set() };
    const nodeIds = new Set([selectedNodeId]);
    const edgeIds = new Set();
    for (const e of edges) {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        nodeIds.add(e.source);
        nodeIds.add(e.target);
        edgeIds.add(e.id);
      }
    }
    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [selectedNodeId, edges]);

  // Derive display nodes: inject highlight/dim state into node data
  const displayNodes = useMemo(() => {
    const hasSelection = !!selectedNodeId;
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isSelected: n.id === selectedNodeId,
        highlighted: hasSelection && connectedNodeIds.has(n.id) && n.id !== selectedNodeId,
        dimmed: hasSelection && !connectedNodeIds.has(n.id),
      },
    }));
  }, [nodes, selectedNodeId, connectedNodeIds]);

  // Derive display edges: highlight connected edges, dim the rest
  const displayEdges = useMemo(() => {
    const hasSelection = !!selectedNodeId;
    return edges.map((e) => {
      const isConnected = connectedEdgeIds.has(e.id);
      return {
        ...e,
        style: {
          stroke: isConnected ? '#818cf8' : '#374151',
          strokeWidth: isConnected ? 2.5 : 1.5,
          opacity: hasSelection && !isConnected ? 0.12 : 1,
          transition: 'opacity 150ms, stroke 150ms',
        },
        // Subtle animation on active edges
        animated: isConnected,
      };
    });
  }, [edges, selectedNodeId, connectedEdgeIds]);

  const onNodeClick = useCallback(
    (_, node) => selectNode(node.id),
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    if (selectedNodeId) deselectNode();
  }, [selectedNodeId, deselectNode]);

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        className="bg-gray-950"
        minZoom={0.05}
        maxZoom={2}
        attributionPosition="bottom-right"
        // Disable multi-selection to keep UX simple
        selectionOnDrag={false}
        selectNodesOnDrag={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1f2937"
        />
        <Controls
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}

export default function KnowledgeTree({ tree }) {
  return (
    <ReactFlowProvider>
      <KnowledgeTreeInner tree={tree} />
    </ReactFlowProvider>
  );
}
