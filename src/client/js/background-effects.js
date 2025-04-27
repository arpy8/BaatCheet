export class BackgroundEffects {
    constructor() {
        this.containerElement = document.body;
    }
    
    init() {
        // Initialize any dynamic background effects
        this._createParticles();
    }
    
    _createParticles() {
        // Add particle container if needed
        const particlesContainer = document.getElementById('particles-js') || this._createParticlesContainer();
        const particleCount = 30; // Reduced from 100 for better performance
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this._createParticle();
            particlesContainer.appendChild(particle);
        }
    }
    
    _createParticlesContainer() {
        const container = document.createElement('div');
        container.id = 'particles-js';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-1';
        document.body.appendChild(container);
        return container;
    }
    
    _createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 1; // Smaller size for better performance
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        const duration = Math.random() * 3 + 2;
        particle.style.animation = `particleAnimation ${duration}s linear infinite alternate`;
        
        return particle;
    }
}
