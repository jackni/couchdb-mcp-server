import { v4 as uuidv4 } from "uuid";

export interface GeneratedCredentials {
  username: string;
  password: string;
}

export interface SecurityConfig {
  credentialPrefix: string;
  passwordLength: number;
  rolePrefix: string;
}

export class CredentialManager {
  constructor(private config: SecurityConfig) {}

  generateCredentials(identifier?: string | number): GeneratedCredentials {
    const username = this.generateUsername(identifier);
    const password = this.generatePassword();
    
    return {
      username,
      password,
    };
  }

  generateUsername(identifier?: string | number): string {
    if (identifier !== undefined) {
      return `${this.config.credentialPrefix}${identifier}-${uuidv4()}`;
    }
    return `${this.config.credentialPrefix}${uuidv4()}`;
  }

  generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let password = '';
    
    for (let i = 0; i < this.config.passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }

  generateRole(identifier?: string | number): string {
    if (identifier !== undefined) {
      return `${this.config.rolePrefix}${identifier}`;
    }
    return `${this.config.rolePrefix}${uuidv4()}`;
  }

  generateApiKey(): string {
    return `key_${uuidv4().replace(/-/g, '')}`;
  }

  // Validation methods
  isValidUsername(username: string): boolean {
    return username.startsWith(this.config.credentialPrefix) && username.length > this.config.credentialPrefix.length;
  }

  isValidRole(role: string): boolean {
    return role.startsWith(this.config.rolePrefix) && role.length > this.config.rolePrefix.length;
  }

  // Security utilities
  hashPassword(password: string): string {
    // In a real implementation, you'd use a proper hashing library like bcrypt
    // This is just a placeholder
    return Buffer.from(password).toString('base64');
  }

  validatePasswordStrength(password: string): boolean {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  }

  // Credential rotation utilities
  rotateCredentials(_currentCredentials: GeneratedCredentials, identifier?: string | number): GeneratedCredentials {
    return this.generateCredentials(identifier);
  }

  // Format credentials for different use cases
  formatCredentialsForCouchDB(credentials: GeneratedCredentials): any {
    return {
      name: credentials.username,
      password: credentials.password,
      type: "user",
      roles: [],
    };
  }

  formatCredentialsForBasicAuth(credentials: GeneratedCredentials): string {
    const combined = `${credentials.username}:${credentials.password}`;
    return Buffer.from(combined).toString('base64');
  }

  // Extract information from generated credentials
  extractIdentifierFromUsername(username: string): string | null {
    if (!this.isValidUsername(username)) {
      return null;
    }
    
    const withoutPrefix = username.substring(this.config.credentialPrefix.length);
    const parts = withoutPrefix.split('-');
    
    if (parts.length >= 2) {
      return parts[0];
    }
    
    return null;
  }

  extractIdentifierFromRole(role: string): string | null {
    if (!this.isValidRole(role)) {
      return null;
    }
    
    return role.substring(this.config.rolePrefix.length);
  }
}