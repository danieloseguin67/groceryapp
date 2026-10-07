import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Customer, verifyAppToken } from './token-auth';
import { LanguageService, TextKey } from './services/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  customerId = '';
  appToken = '';
  private loginErrorKey: TextKey | '' = '';
  get loginError(): string {
    return this.loginErrorKey ? this.t(this.loginErrorKey) : '';
  }
  loginSuccess = false;
  isLoggingIn = false;
  private customers: Customer[] = [];

  constructor(private http: HttpClient, private router: Router, public language: LanguageService) {}

  t(key: TextKey): string { return this.language.text(key); }

  ngOnInit(): void {
    this.http.get<Customer[]>('assets/customers.json').subscribe({
      next: (data) => {
        this.customers = data;
      },
      error: (error) => {
        console.error('Error loading customers data:', error);
        this.loginErrorKey = 'Failed to load authentication data.';
      }
    });
  }

  async onLogin(): Promise<void> {
    if (this.isLoggingIn || this.loginSuccess) return;

    if (this.customers.length === 0) {
      this.loginErrorKey = 'Authentication data not loaded yet. Please try again.';
      return;
    }

    const customer = this.customers.find(c => c.customer_id === this.customerId);
    this.isLoggingIn = true;
    this.loginErrorKey = '';
    try {
      if (customer && await verifyAppToken(this.appToken, customer.apptoken)) {
        this.loginSuccess = true;
        this.appToken = '';
        localStorage.setItem('customerId', customer.customer_id);

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 300);
      } else {
        this.loginErrorKey = 'You have entered an incorrect Customer ID or Application Token. Please retry.';
        this.loginSuccess = false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.loginSuccess = false;
      this.loginErrorKey = 'Unable to verify your token. Use HTTPS or localhost, or contact support to check the authentication data.';
    } finally {
      this.isLoggingIn = false;
    }
  }
}
