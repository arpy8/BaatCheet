/**
 * Manages audio playback for notification sounds
 */
export class AudioManager {
    constructor() {
        // Preload audio files
        this.joinSound = new Audio('/assets/audio/user-join.mp3');
        this.leaveSound = new Audio('/assets/audio/user-leave.mp3');
        this.selfJoinSound = new Audio('/assets/audio/user-join.mp3');
        
        // Set volume levels (adjust as needed)
        this.joinSound.volume = 0.5;
        this.leaveSound.volume = 0.5;
        this.selfJoinSound.volume = 0.5;
    }

    /**
     * Play sound when another user joins the room
     */
    playUserJoinSound() {
        this._playSound(this.joinSound);
    }

    /**
     * Play sound when a user leaves the room
     */
    playUserLeaveSound() {
        this._playSound(this.leaveSound);
    }

    /**
     * Play sound when the current user joins a room
     */
    playSelfJoinSound() {
        this._playSound(this.selfJoinSound);
    }

    /**
     * Helper method to play a sound with error handling
     * @param {HTMLAudioElement} audioElement - The audio element to play
     */
    _playSound(audioElement) {
        // Reset playback position to start
        audioElement.currentTime = 0;
        
        // Play with error handling
        audioElement.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    }
}
