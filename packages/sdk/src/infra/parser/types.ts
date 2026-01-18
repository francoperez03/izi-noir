import type * as acorn from 'acorn';

/**
 * Extended Acorn AST node type that allows access to any property.
 * Acorn's Node type is minimal, but the actual AST nodes have many
 * additional properties depending on the node type.
 */
export type AcornNode = acorn.Node & Record<string, any>;
