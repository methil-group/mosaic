import { Tool } from './Tool';
import { BashTool } from './BashTool';
import { ReadFileTool } from './ReadFileTool';
import { WriteFileTool } from './WriteFileTool';
import { ReplaceContentTool } from './ReplaceContentTool';
import { InsertLineTool } from './InsertLineTool';
import { ManageTodosTool } from './ManageTodosTool';

export * from './Tool';
export * from './BashTool';
export * from './ReadFileTool';
export * from './WriteFileTool';
export * from './ReplaceContentTool';
export * from './InsertLineTool';
export * from './ManageTodosTool';

export function getTools(): Tool[] {
  return [
    new BashTool(),
    new ReadFileTool(),
    new WriteFileTool(),
    new ReplaceContentTool(),
    new InsertLineTool(),
    new ManageTodosTool()
  ];
}
