import { NetClient } from '../../services/netcode/NetClient';
import { NetworkManager } from '../../services/netcode/NetworkManager';
import { ConsoleCommandManager } from '../../ui/ui_components/console/ConsoleCommandManager';
import { MovementJoystick } from './MovementJoystick';
import { LookJoystick } from './LookJoystick';
import BaseKeyboardCommand from '../keyboard_actions/BaseKeyboardCommand';

export class MobileChatComponent {
    private static readonly CHAT_HEIGHT = '70%'; // Reduced from 80% to 70%
    private static readonly HANDLE_HEIGHT = '15px'; // Reduced from 30px to 25px
    private static readonly ACTIVE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.9)';
    private static readonly INACTIVE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.5)';
    private static readonly HANDLE_COLOR = 'rgba(180, 180, 180, 0.8)'; // Silver color for handle
    private static readonly FONT_COLOR = 'white';
    private static readonly FONT_FAMILY = 'Monospace';
    private static readonly Z_INDEX = 1000;
    private static readonly MAX_MESSAGES = 50;
    
    // Threshold settings for auto-sliding
    private static readonly OPEN_THRESHOLD_PERCENT = 15; // Only need to drag 15% to auto-open
    private static readonly CLOSE_THRESHOLD_PERCENT = 25; // Need to drag 25% to auto-close

    // Singleton instance
    private static instance: MobileChatComponent | null = null;

    private chatContainer: HTMLElement;
    private chatHandle: HTMLElement;
    private messageDisplay: HTMLElement;
    private inputBox: HTMLInputElement;
    private sendButton: HTMLButtonElement;
    private messages: { sender: string, text: string, timestamp: number }[] = [];
    private isOpen: boolean = false;
    private movementJoystick: MovementJoystick | null = null;
    private lookJoystick: LookJoystick | null = null;
    private netClient: NetClient;
    private consoleCommandManager: ConsoleCommandManager;
    private dragStartY: number = 0;
    private currentTranslateY: number = 0;
    private isDragging: boolean = false;

    /**
     * Get the singleton instance of MobileChatComponent
     */
    public static getInstance(): MobileChatComponent {
        if (!MobileChatComponent.instance) {
            MobileChatComponent.instance = new MobileChatComponent();
        }
        return MobileChatComponent.instance;
    }

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        this.netClient = NetClient.getInstance();
        this.consoleCommandManager = ConsoleCommandManager.getInstance();
        
        // Initialize console commands
        this.consoleCommandManager.initialize();
        
        // Create the chat container element
        this.chatContainer = document.createElement('div');
        this.chatHandle = document.createElement('div');
        this.messageDisplay = document.createElement('div');
        this.inputBox = document.createElement('input');
        this.sendButton = document.createElement('button');
        
        // Style and append the chat elements to the document
        this.setupElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Add some welcome messages
        this.addMessage('System', 'Welcome to the server :^)');
    }

    /**
     * Set the joystick references to control their visibility
     */
    public setJoysticks(movementJoystick: MovementJoystick, lookJoystick: LookJoystick): void {
        this.movementJoystick = movementJoystick;
        this.lookJoystick = lookJoystick;
    }

    private setupElements() {
        // Add custom scrollbar styles directly to document
        this.addScrollbarStyles();

        // Style for the chat container - initially positioned off-screen
        this.chatContainer.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${MobileChatComponent.CHAT_HEIGHT};
            background-color: ${MobileChatComponent.ACTIVE_BACKGROUND_COLOR};
            color: ${MobileChatComponent.FONT_COLOR};
            font-family: ${MobileChatComponent.FONT_FAMILY};
            z-index: ${MobileChatComponent.Z_INDEX};
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            touch-action: none;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5);
        `;

        // Style for the chat handle/pull tab
        this.chatHandle.style.cssText = `
            position: absolute;
            top: -${MobileChatComponent.HANDLE_HEIGHT};
            left: 0;
            right: 0;
            height: ${MobileChatComponent.HANDLE_HEIGHT};
            background-color: ${MobileChatComponent.HANDLE_COLOR};
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: grab;
            border-top-left-radius: 15px;
            border-top-right-radius: 15px;
            touch-action: none;
        `;

        // Add visual indicator for the handle
        const handleIndicator = document.createElement('div');
        handleIndicator.style.cssText = `
            width: 35px;
            height: 4px;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 4px;
        `;
        this.chatHandle.appendChild(handleIndicator);

        // Style for the message display area
        this.messageDisplay.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column-reverse;
            font-size: 14px;
            scrollbar-width: thin;
            scrollbar-color: rgba(100, 100, 100, 0.5) rgba(0, 0, 0, 0);
            opacity: 0.7;
            transition: opacity 0.3s ease;
        `;
        this.messageDisplay.className = 'chat-messages';

        // Create a container for the input box and send button
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            height: 45px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding: 5px;
        `;

        // Style for the input box
        this.inputBox.style.cssText = `
            flex: 1;
            background-color: rgba(30, 30, 30, 0.8);
            border: none;
            border-radius: 20px;
            padding: 0 15px;
            color: ${MobileChatComponent.FONT_COLOR};
            font-family: ${MobileChatComponent.FONT_FAMILY};
            font-size: 16px;
            margin-right: 5px;
        `;
        this.inputBox.placeholder = 'Type a message...';

        // Style for the send button
        this.sendButton.style.cssText = `
            width: 60px;
            background-color: rgba(180, 180, 180, 0.8);
            color: #222;
            border: none;
            border-radius: 20px;
            font-family: ${MobileChatComponent.FONT_FAMILY};
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
        `;
        this.sendButton.textContent = 'Send';

        // Append the input box and send button to the input container
        inputContainer.appendChild(this.inputBox);
        inputContainer.appendChild(this.sendButton);

        // Append elements to the chat container
        this.chatContainer.appendChild(this.chatHandle);
        this.chatContainer.appendChild(this.messageDisplay);
        this.chatContainer.appendChild(inputContainer);

        // Append the chat container to the document body
        document.body.appendChild(this.chatContainer);
    }

    /**
     * Adds custom scrollbar styles to document
     */
    private addScrollbarStyles() {
        // Only add styles once
        if (document.getElementById('mobile-chat-scrollbar-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'mobile-chat-scrollbar-styles';
        styleSheet.textContent = `
            .chat-messages::-webkit-scrollbar {
                width: 4px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: rgba(150, 150, 150, 0.5);
                border-radius: 2px;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    private setupEventListeners() {
        // Add touch events for sliding the chat panel up and down
        this.chatHandle.addEventListener('touchstart', this.handleTouchStart);
        this.chatHandle.addEventListener('touchmove', this.handleTouchMove);
        this.chatHandle.addEventListener('touchend', this.handleTouchEnd);
        
        // Add touch events to the entire chat container (except input elements)
        this.chatContainer.addEventListener('touchstart', (event) => {
            // Don't trigger dragging when touching input elements
            if (event.target === this.inputBox || event.target === this.sendButton) {
                return;
            }
            this.handleTouchStart(event);
        });
        
        this.chatContainer.addEventListener('touchmove', (event) => {
            // Don't drag when touching input elements
            if (!this.isDragging) {
                return;
            }
            this.handleTouchMove(event);
        });
        
        this.chatContainer.addEventListener('touchend', (event) => {
            // Only process touchend if we were dragging
            if (!this.isDragging) {
                return;
            }
            this.handleTouchEnd(event);
        });

        // Event listener for the send button
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Event listener for the input box (Enter key)
        this.inputBox.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const message = this.inputBox.value.trim();
                if (message) {
                    // If input has text, send the message
                    this.sendMessage();
                } else {
                    // If input is empty, toggle chat off
                    this.closeChat();
                }
                event.preventDefault();
            }
        });

        // Event listener for the input box (Escape key)
        this.inputBox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeChat();
                event.preventDefault();
            }
        });

        // Listen for chat messages from the server
        document.addEventListener('socket_chat_message', (event: any) => {
            if (event.detail) {
                const { sender, message, timestamp } = event.detail;
                this.addMessage(sender, message, timestamp);
            }
        });
    }

    private handleTouchStart = (event: TouchEvent) => {
        // Don't start dragging if we're touching the message content in scroll area
        // This allows for scrolling messages without closing the chat
        if (this.isScrollingMessageArea(event)) {
            return;
        }
        
        this.isDragging = true;
        this.dragStartY = event.touches[0].clientY;
        this.currentTranslateY = this.isOpen ? 0 : 100;
        
        // Remove transition during drag for responsiveness
        this.chatContainer.style.transition = 'none';
        
        // Prevent default to avoid scrolling the page
        event.preventDefault();
    }
    
    private isScrollingMessageArea(event: TouchEvent): boolean {
        // Check if touch target is the message display and it has scrollable content
        const target = event.target as HTMLElement;
        if (this.messageDisplay.contains(target)) {
            return this.messageDisplay.scrollHeight > this.messageDisplay.clientHeight;
        }
        return false;
    }

    private handleTouchMove = (event: TouchEvent) => {
        if (!this.isDragging) return;
        
        const touchY = event.touches[0].clientY;
        const deltaY = touchY - this.dragStartY;
        
        // Only allow dragging downward to close (not upward to open further)
        if (this.isOpen && deltaY < 0) {
            return;
        }
        
        // Calculate new position as percentage (0 = fully open, 100 = fully closed)
        let newTranslateY = this.currentTranslateY + (deltaY / window.innerHeight * 100);
        
        // Clamp values
        newTranslateY = Math.max(0, Math.min(newTranslateY, 100));
        
        // Apply the transform
        this.chatContainer.style.transform = `translateY(${newTranslateY}%)`;
        
        // Prevent default to avoid scrolling the page
        event.preventDefault();
    }

    private handleTouchEnd = (event: TouchEvent) => {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Restore transition for smooth animation
        this.chatContainer.style.transition = 'transform 0.3s ease';
        
        // Get the current position from the transform style
        const currentTransform = this.chatContainer.style.transform;
        const match = currentTransform.match(/translateY\(([0-9.]+)%\)/);
        
        if (match) {
            const currentPosition = parseFloat(match[1]);
            
            // Use different thresholds depending on whether we're opening or closing
            if (!this.isOpen) {
                // When opening (sliding up from bottom)
                if (currentPosition < (100 - MobileChatComponent.OPEN_THRESHOLD_PERCENT)) {
                    this.openChat(); // If dragged up more than threshold, snap to open
                } else {
                    this.closeChat(); // Otherwise, snap to closed
                }
            } else {
                // When closing (sliding down from open position)
                if (currentPosition > MobileChatComponent.CLOSE_THRESHOLD_PERCENT) {
                    this.closeChat(); // If dragged down more than threshold, snap to closed
                } else {
                    this.openChat(); // Otherwise, snap to open
                }
            }
        }
    }

    /**
     * Open the chat panel by sliding it up
     */
    public openChat(): void {
        this.isOpen = true;
        this.chatContainer.style.transform = 'translateY(0)';
        
        // Update visual state for active chat
        this.messageDisplay.style.opacity = '1';
        
        // Focus the input box when opening
        setTimeout(() => {
            this.inputBox.focus();
        }, 300);
        
        // Hide joysticks when chat is open
        this.toggleJoysticksVisibility(false);
        
        // Pause keyboard commands when chat is open
        BaseKeyboardCommand.pauseState = true;
    }

    /**
     * Close the chat panel by sliding it down
     */
    public closeChat(): void {
        this.isOpen = false;
        this.chatContainer.style.transform = 'translateY(100%)';
        
        // Update visual state for inactive chat
        this.messageDisplay.style.opacity = '0.7';
        
        // Blur the input box when closing
        this.inputBox.blur();
        
        // Show joysticks when chat is closed
        this.toggleJoysticksVisibility(true);
        
        // Resume keyboard commands when chat is closed
        BaseKeyboardCommand.pauseState = false;
    }

    /**
     * Toggle visibility of joysticks
     */
    private toggleJoysticksVisibility(visible: boolean): void {
        if (this.movementJoystick && this.lookJoystick) {
            const joystickElements = document.querySelectorAll('.nipple-container');
            joystickElements.forEach(element => {
                (element as HTMLElement).style.opacity = visible ? '1' : '0';
                (element as HTMLElement).style.pointerEvents = visible ? 'auto' : 'none';
            });
        }
    }

    private async sendMessage() {
        const message = this.inputBox.value.trim();
        if (message) {
            // Check if this is a console command
            if (message.startsWith('$')) {
                const { wasCommand, result } = await this.consoleCommandManager.handlePotentialCommand(message);
                
                if (wasCommand) {
                    // Clear the input box
                    this.inputBox.value = '';
                    
                    // Display the command result if there is one
                    if (result) {
                        this.addMessage('System', result);
                    }
                    
                    return;
                }
                // If not a recognized command, continue as normal message
            }
            
            // Use NetworkManager to send the message to the server
            const networkManager = NetworkManager.getInstance();
            const sent = networkManager.sendChatMessage(message);
            
            if (sent) {
                // Clear the input box only if message was sent
                this.inputBox.value = '';
            } else {
                // If message couldn't be sent, show an error
                this.addMessage('System', 'Failed to send message: not connected to server', Date.now());
            }
        }
    }

    /**
     * Add a message to the chat display
     * @param sender The name of the message sender
     * @param text The message text
     * @param timestamp Optional timestamp for the message
     */
    public addMessage(sender: string, text: string, timestamp: number = Date.now()) {
        this.messages.unshift({
            sender,
            text,
            timestamp
        });
        
        // Limit the number of messages
        if (this.messages.length > MobileChatComponent.MAX_MESSAGES) {
            this.messages.pop();
        }
        
        // Update the display
        this.updateMessageDisplay();
        
        // Flash the handle when a new message arrives if chat is closed
        if (!this.isOpen) {
            this.flashChatHandle();
        }
    }

    /**
     * Flash the chat handle to indicate a new message
     */
    private flashChatHandle(): void {
        // Temporarily change background color of handle
        const originalColor = this.chatHandle.style.backgroundColor;
        this.chatHandle.style.backgroundColor = 'rgba(220, 220, 220, 0.9)'; // Silver flash
        
        // Revert back after a short delay
        setTimeout(() => {
            this.chatHandle.style.backgroundColor = originalColor;
        }, 500);
    }

    /**
     * Update the message display with the current messages
     */
    private updateMessageDisplay() {
        // Clear the current messages
        this.messageDisplay.innerHTML = '';
        
        // Add each message to the display
        this.messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.style.cssText = `
                margin-bottom: 5px;
                word-wrap: break-word;
            `;
            
            const time = new Date(msg.timestamp);
            const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
            
            // Determine color based on sender
            let senderColor = '#88f'; // Default blue for normal users
            
            if (msg.sender === 'System') {
                senderColor = '#f55'; // Red for system messages
            } else if (msg.sender === 'You') {
                senderColor = '#5f5'; // Green for the user's own messages
            } else if (msg.sender.startsWith('Client')) {
                // Generate a consistent color based on the client ID
                const clientId = msg.sender;
                senderColor = this.getClientColor(clientId);
            }
            
            messageElement.innerHTML = `
                <span style="color: #aaa;">[${timeStr}]</span> 
                <span style="color: ${senderColor}; font-weight: bold;">${msg.sender}:</span> 
                ${msg.text}
            `;
            
            this.messageDisplay.appendChild(messageElement);
        });
    }

    /**
     * Generate a consistent color for a client based on their ID
     * @param clientId The client identifier
     * @returns A CSS color string
     */
    private getClientColor(clientId: string): string {
        // Simple hash function to convert clientId to a number
        let hash = 0;
        for (let i = 0; i < clientId.length; i++) {
            hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Generate colors in the blue-purple-cyan range to differentiate from system/self
        const h = Math.abs(hash) % 180 + 180; // Hue between 180-360 (cyan to blue to purple)
        const s = 70 + (Math.abs(hash) % 30); // Saturation between 70-100%
        const l = 45 + (Math.abs(hash) % 20); // Lightness between 45-65%
        
        return `hsl(${h}, ${s}%, ${l}%)`;
    }

    /**
     * Check if the chat is currently open
     */
    public isOpened(): boolean {
        return this.isOpen;
    }
    
    /**
     * Clear all messages from the chat
     */
    public clearMessages(): void {
        // Clear the messages array
        this.messages = [];
        
        // Update the display
        this.updateMessageDisplay();
    }
}