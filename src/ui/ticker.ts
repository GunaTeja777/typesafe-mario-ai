export class Ticker {
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  public notify(message: string) {
    this.el.style.opacity = '0';
    this.el.style.transform = 'translateY(4px)';

    setTimeout(() => {
      this.el.textContent = message;
      this.el.style.opacity = '1';
      this.el.style.transform = 'translateY(0)';
    }, 120);
  }
}
