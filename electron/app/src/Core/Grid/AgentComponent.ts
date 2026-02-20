import { AbstractGridComponent } from './AbstractGridComponent';

export class AgentComponent extends AbstractGridComponent {
  constructor(
    name: string,
    color: string,
    icon: string,
    public description: string,
    public systemPrompt: string,
    public lottie?: string,
    public video?: string
  ) {
    super(name, color, icon);
  }
}
