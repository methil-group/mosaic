export interface Tool {
  name(): string;
  description(): string;
  execute(args: any): Promise<any>;
}

export abstract class BaseTool implements Tool {
  abstract name(): string;
  abstract description(): string;
  abstract execute(args: any): Promise<any>;

  protected formatError(message: string): string {
    return `Error: ${message}`;
  }
}
