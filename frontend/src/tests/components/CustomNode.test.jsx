import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @xyflow/react to avoid DOM issues in tests
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

import CustomNode from '../../components/tree/CustomNode.jsx';

function renderNode(type, status = 'undocumented', label = 'Test Node', extra = {}) {
  return render(
    <CustomNode
      data={{ label, type, status, nodeId: 'node-1', ...extra }}
    />
  );
}

describe('CustomNode', () => {
  it('renders the node label', () => {
    renderNode('feature');
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('has blue background class for feature type', () => {
    const { container } = renderNode('feature');
    const node = container.querySelector('[data-type="feature"]');
    expect(node.className).toContain('bg-blue-900');
  });

  it('has purple background class for module type', () => {
    const { container } = renderNode('module');
    const node = container.querySelector('[data-type="module"]');
    expect(node.className).toContain('bg-purple-900');
  });

  it('has red background class for constraint type', () => {
    const { container } = renderNode('constraint');
    const node = container.querySelector('[data-type="constraint"]');
    expect(node.className).toContain('bg-red-900');
  });

  it('has orange background class for decision type', () => {
    const { container } = renderNode('decision');
    const node = container.querySelector('[data-type="decision"]');
    expect(node.className).toContain('bg-orange-900');
  });

  it('has green background class for actor type', () => {
    const { container } = renderNode('actor');
    const node = container.querySelector('[data-type="actor"]');
    expect(node.className).toContain('bg-green-900');
  });

  it('has teal background class for flow type', () => {
    const { container } = renderNode('flow');
    const node = container.querySelector('[data-type="flow"]');
    expect(node.className).toContain('bg-teal-900');
  });

  it('has yellow background class for open_question type', () => {
    const { container } = renderNode('open_question');
    const node = container.querySelector('[data-type="open_question"]');
    expect(node.className).toContain('bg-yellow-900');
  });

  it('shows status indicator dot', () => {
    renderNode('feature', 'documented');
    const statusDot = screen.getByTitle('documented');
    expect(statusDot).toBeInTheDocument();
  });

  it('shows ring when selected', () => {
    const { container } = renderNode('feature', 'undocumented', 'Test Node', { isSelected: true });
    const node = container.querySelector('[data-testid="custom-node"]');
    expect(node.className).toContain('ring-2');
  });

  it('renders source and target handles', () => {
    renderNode('feature');
    expect(screen.getByTestId('handle-source')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target')).toBeInTheDocument();
  });
});
