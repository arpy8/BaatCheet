export class NotificationManager {
    constructor(elementId) {
        this.notificationElement = document.getElementById(elementId);
        this.queue = [];
        this.isShowing = false;
        
        // Listen for notification events
        document.addEventListener('notification', (e) => {
            this.showNotification(e.detail.message, e.detail.type);
        });
    }

    showNotification(message, type = 'success', duration = 3000) {
        // Add to queue
        this.queue.push({ message, type, duration });
        
        // If not currently showing a notification, show the next one
        if (!this.isShowing) {
            this._showNextNotification();
        }
    }
    
    _showNextNotification() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        const { message, type, duration } = this.queue.shift();
        
        // Reset classes
        this.notificationElement.className = 'notification';
        
        // Set type class
        if (type === 'error') {
            this.notificationElement.classList.add('error');
        }
        
        // Set message
        this.notificationElement.textContent = message;
        
        // Show notification
        requestAnimationFrame(() => {
            this.notificationElement.classList.add('show');
            
            // Hide after duration
            setTimeout(() => {
                this.notificationElement.classList.remove('show');
                
                // Wait for transition to complete before showing next notification
                setTimeout(() => {
                    this._showNextNotification();
                }, 300);
            }, duration);
        });
    }
}
