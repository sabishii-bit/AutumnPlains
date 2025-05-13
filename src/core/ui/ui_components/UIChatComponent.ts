import { NetClient } from '../../services/netcode/NetClient';
import BaseKeyboardCommand from '../../controls/keyboard_actions/BaseKeyboardCommand';
import { DeviceDetectionService } from '../../services/device/DeviceDetectionService';
import { NetworkManager } from '../../services/netcode/NetworkManager';
import { ConsoleCommandManager } from './console/ConsoleCommandManager';

export class UIChatComponent {
    private static readonly CHAT_WIDTH = 300;
    private static readonly CHAT_HEIGHT = 200;
    private static readonly INPUT_HEIGHT = 30;
    private static readonly BORDER_RADIUS = 5;
    private static readonly ACTIVE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.8)';
    private static readonly INACTIVE_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.3)';
    private static readonly FONT_COLOR = 'white';
    private static readonly FONT_FAMILY = 'Monospace';
    private static readonly Z_INDEX = 1000;
    private static readonly MAX_MESSAGES = 50;

    // Singleton instance
    private static instance: UIChatComponent | null = null;

    private chatContainer: HTMLElement;
    private messageDisplay: HTMLElement;
    private inputBox: HTMLInputElement;
    private sendButton: HTMLButtonElement;
    private messages: { sender: string, text: string, timestamp: number }[] = [];
    private visible: boolean = true;
    private active: boolean = false;
    private netClient: NetClient;
    private deviceDetectionService: DeviceDetectionService;
    private isMobileDevice: boolean = false;
    private consoleCommandManager: ConsoleCommandManager;

    /**
     * Get the singleton instance of UIChatComponent
     */
    public static getInstance(): UIChatComponent {
        if (!UIChatComponent.instance) {
            UIChatComponent.instance = new UIChatComponent();
        }
        return UIChatComponent.instance;
    }

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        this.netClient = NetClient.getInstance();
        this.deviceDetectionService = DeviceDetectionService.getInstance();
        this.isMobileDevice = this.deviceDetectionService.isMobile();
        this.consoleCommandManager = ConsoleCommandManager.getInstance();
        
        // Initialize console commands
        this.consoleCommandManager.initialize();
        
        // Create the chat container element
        this.chatContainer = document.createElement('div');
        this.messageDisplay = document.createElement('div');
        this.inputBox = document.createElement('input');
        this.sendButton = document.createElement('button');
        
        // Style and append the chat elements to the document
        this.setupElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start in inactive state
        this.setActive(false);
        
        // Hide chat on mobile devices
        if (this.isMobileDevice) {
            this.setVisibility(false);
            console.log('Chat component hidden on mobile device');
        }
    }

    private setupElements() {
        // Skip creating UI elements for mobile
        if (this.isMobileDevice) {
            console.log('Skipping chat UI setup for mobile device');
            return;
        }
        
        // Style for the chat container
        this.chatContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: ${UIChatComponent.CHAT_WIDTH}px;
            height: ${UIChatComponent.CHAT_HEIGHT}px;
            background-color: ${UIChatComponent.INACTIVE_BACKGROUND_COLOR};
            border-radius: ${UIChatComponent.BORDER_RADIUS}px;
            color: ${UIChatComponent.FONT_COLOR};
            font-family: ${UIChatComponent.FONT_FAMILY};
            display: flex;
            flex-direction: column;
            z-index: ${UIChatComponent.Z_INDEX};
            overflow: hidden;
            transition: background-color 0.3s ease;
            pointer-events: auto;
        `;

        // Add custom scrollbar styles directly to document
        this.addScrollbarStyles();

        // Style for the message display area
        this.messageDisplay.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column-reverse;
            font-size: 14px;
            opacity: 0.7;
            transition: opacity 0.3s ease;
            scrollbar-width: thin;
            scrollbar-color: rgba(100, 100, 100, 0.5) rgba(0, 0, 0, 0);
        `;
        this.messageDisplay.className = 'chat-messages'; // Add class for custom scrollbar styling

        // Create a container for the input box and send button
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            height: ${UIChatComponent.INPUT_HEIGHT}px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        `;

        // Style for the input box
        this.inputBox.style.cssText = `
            flex: 1;
            background-color: rgba(0, 0, 0, 0.3);
            border: none;
            padding: 0 10px;
            color: ${UIChatComponent.FONT_COLOR};
            font-family: ${UIChatComponent.FONT_FAMILY};
            font-size: 14px;
            pointer-events: auto;
            cursor: text;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        `;
        this.inputBox.placeholder = 'Type a message...';

        // Style for the send button
        this.sendButton.style.cssText = `
            width: 60px;
            background-color: rgba(0, 0, 0, 0.3);
            color: ${UIChatComponent.FONT_COLOR};
            border: none;
            border-left: 1px solid rgba(255, 255, 255, 0.2);
            font-family: ${UIChatComponent.FONT_FAMILY};
            cursor: pointer;
            pointer-events: auto;
            transition: background-color 0.3s ease;
        `;
        this.sendButton.textContent = 'Send';

        // Append the input box and send button to the input container
        inputContainer.appendChild(this.inputBox);
        inputContainer.appendChild(this.sendButton);

        // Append the message display and input container to the chat container
        this.chatContainer.appendChild(this.messageDisplay);
        this.chatContainer.appendChild(inputContainer);

        // Append the chat container to the document body
        document.body.appendChild(this.chatContainer);

        // Add some welcome messages
        this.addMessage('System', 'Welcome to the server :^)');
        this.addMessage('System', 'Press Enter to toggle chat.');
    }

    /**
     * Adds custom scrollbar styles to document
     */
    private addScrollbarStyles() {
        // Only add styles once
        if (document.getElementById('chat-scrollbar-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'chat-scrollbar-styles';
        styleSheet.textContent = `
            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .chat-messages::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }
            
            .chat-messages::-webkit-scrollbar-thumb {
                background: rgba(100, 100, 100, 0.5);
                border-radius: 3px;
            }
            
            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: rgba(150, 150, 150, 0.7);
            }
            
            /* For Firefox */
            .chat-messages {
                scrollbar-width: thin;
                scrollbar-color: rgba(100, 100, 100, 0.5) rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(styleSheet);
    }

    private setupEventListeners() {
        // Skip setting up event listeners for mobile
        if (this.isMobileDevice) {
            return;
        }
        
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
                    this.toggleChat(false);
                }
                event.preventDefault();
            }
        });

        // Event listener for the input box (Escape key)
        this.inputBox.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.toggleChat(false);
                event.preventDefault();
            }
        });

        // Add a global document-level Escape key handler to ensure it works even when input isn't focused
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.active) {
                // If chat is active, deactivate it on Escape key press
                this.toggleChat(false);
                // Don't preventDefault here to allow other Escape handlers to work when needed
            }
        });

        // Prevent propagation of keyboard events when active
        this.inputBox.addEventListener('keydown', (event) => {
            if (this.active) {
                event.stopPropagation();
            }
        });

        // Add click event listener to toggle chat on when input is clicked
        this.inputBox.addEventListener('click', (event) => {
            if (!this.active) {
                // Toggle chat on if currently inactive
                this.toggleChat(true);
                // Make sure the event doesn't propagate to other handlers
                event.stopPropagation();
            }
        });

        // Make input box still clickable even when inactive
        this.inputBox.addEventListener('mousedown', (event) => {
            // Prevent default behavior to maintain focus control
            event.preventDefault();
            // Don't stop propagation here to allow the click event to fire
        });

        // Add blur event listener to detect when input loses focus
        this.inputBox.addEventListener('blur', (event) => {
            // Short delay to allow click events to process first
            // (avoids issues with button clicks immediately triggering blur)
            setTimeout(() => {
                // Only handle blur if we're still active
                if (this.active && document.activeElement !== this.inputBox) {
                    // Check if the new active element is the send button
                    // If it is, don't deactivate (user is clicking the send button)
                    if (document.activeElement !== this.sendButton) {
                        this.toggleChat(false);
                    }
                }
            }, 100);
        });

        // Add click listener to detect clicks outside the chat
        document.addEventListener('click', (event) => {
            if (this.active) {
                // Check if the click was outside the chat container
                const target = event.target as HTMLElement;
                if (!this.chatContainer.contains(target)) {
                    this.toggleChat(false);
                }
            }
        });

        // Handle mousedown on the chat container to prevent focus issues
        this.chatContainer.addEventListener('mousedown', (event) => {
            // If clicking in the chat container but not on input or button,
            // don't let it steal focus from the input
            const target = event.target as HTMLElement;
            if (target !== this.inputBox && target !== this.sendButton) {
                // Prevent default to keep focus on input
                event.preventDefault();
                
                // If we're inactive, activate on any click in the container
                if (!this.active) {
                    this.toggleChat(true);
                }
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

    /**
     * Toggle the chat active state
     * @param active If provided, forces the active state to this value
     */
    public toggleChat(active?: boolean): void {
        // Don't toggle on mobile devices
        if (this.isMobileDevice) {
            return;
        }
        
        const newState = active !== undefined ? active : !this.active;
        // Only toggle if state is actually changing
        if (newState !== this.active) {
            this.setActive(newState);
            // Log for debugging
            console.log(`Chat toggled ${newState ? 'ON' : 'OFF'}`);
        }
    }

    /**
     * Set the chat active state
     * @param active Whether the chat should be active
     */
    public setActive(active: boolean): void {
        // Don't activate on mobile devices
        if (this.isMobileDevice) {
            this.active = false;
            return;
        }
        
        this.active = active;
        
        // Update visual state
        if (active) {
            // Active state - full opacity
            this.chatContainer.style.backgroundColor = UIChatComponent.ACTIVE_BACKGROUND_COLOR;
            this.messageDisplay.style.opacity = '1';
            this.inputBox.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.inputBox.style.boxShadow = 'inset 0 0 3px rgba(255, 255, 255, 0.2)';
            this.sendButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            this.inputBox.focus();
            // Pause keyboard commands to prevent game inputs while typing
            BaseKeyboardCommand.pauseState = true;
            
            // Add a visual indicator that chat is active
            this.chatContainer.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        } else {
            // Inactive state - transparent
            this.chatContainer.style.backgroundColor = UIChatComponent.INACTIVE_BACKGROUND_COLOR;
            this.messageDisplay.style.opacity = '0.7';
            this.inputBox.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            this.inputBox.style.boxShadow = 'none';
            this.sendButton.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            this.inputBox.blur();
            // Resume keyboard commands
            BaseKeyboardCommand.pauseState = false;
            
            // Remove the active indicator
            this.chatContainer.style.border = 'none';
            
            // Ensure focus is removed from the input
            if (document.activeElement === this.inputBox) {
                this.inputBox.blur();
            }
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
                    
                    // Make chat lose focus and fade out
                    this.toggleChat(false);
                    
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
                
                // Make chat lose focus and fade out
                this.toggleChat(false);
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
        // Still store messages even on mobile, but don't update the display
        this.messages.unshift({
            sender,
            text,
            timestamp
        });
        
        // Limit the number of messages
        if (this.messages.length > UIChatComponent.MAX_MESSAGES) {
            this.messages.pop();
        }
        
        // Only update the display if not on mobile
        if (!this.isMobileDevice) {
            this.updateMessageDisplay();
        }
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
                // This ensures the same client always gets the same color
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
     * Toggle the visibility of the chat
     * @param visible Whether the chat should be visible
     */
    public setVisibility(visible: boolean) {
        // On mobile, always keep it invisible
        if (this.isMobileDevice) {
            this.visible = false;
            if (this.chatContainer) {
                this.chatContainer.style.display = 'none';
            }
            return;
        }
        
        this.visible = visible;
        if (this.chatContainer) {
            this.chatContainer.style.display = visible ? 'flex' : 'none';
        }
    }

    /**
     * Toggle focus on the input box
     * @param focus Whether to focus the input box
     */
    public setFocus(focus: boolean) {
        if (focus) {
            this.inputBox.focus();
        } else {
            this.inputBox.blur();
        }
        
        // When focusing, make sure the chat is visible and active
        if (focus && !this.active) {
            this.setActive(true);
        }
    }

    /**
     * Check if the chat input is currently focused
     */
    public isFocused(): boolean {
        return document.activeElement === this.inputBox;
    }

    /**
     * Check if the chat is currently in active state
     */
    public isActive(): boolean {
        return this.active;
    }

    /**
     * Update method called by the UI manager
     */
    public update(deltaTime: number) {
        // Update logic can go here if needed
    }

    /**
     * Check if the component is running on a mobile device
     */
    public isOnMobileDevice(): boolean {
        return this.isMobileDevice;
    }

    /**
     * Clear all messages from the chat
     */
    public clearMessages(): void {
        // Clear the messages array
        this.messages = [];
        
        // Update the display if not on mobile
        if (!this.isMobileDevice) {
            this.updateMessageDisplay();
        }
    }
} 