import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Customer, verifyAppToken } from './token-auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  customerId = '';
  appToken = '';
  loginError = '';
  loginSuccess = false;
  isLoggingIn = false;
  private customers: Customer[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<Customer[]>('assets/customers.json').subscribe({
      next: (data) => {
        this.customers = data;
      },
      error: (error) => {
        console.error('Error loading customers data:', error);
        this.loginError = 'Failed to load authentication data.';
      }
    });
  }

  async onLogin(): Promise<void> {
    if (this.isLoggingIn || this.loginSuccess) return;

    if (this.customers.length === 0) {
      this.loginError = 'Authentication data not loaded yet. Please try again.';
      return;
    }

    const customer = this.customers.find(c => c.customer_id === this.customerId);
    this.isLoggingIn = true;
    this.loginError = '';
    try {
      if (customer && await verifyAppToken(this.appToken, customer.apptoken)) {
        this.loginSuccess = true;
        this.appToken = '';
        localStorage.setItem('customerId', customer.customer_id);

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 300);
      } else {
        this.loginError = 'You have entered an incorrect Customer ID or Application Token. Please retry.';
        this.loginSuccess = false;
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      this.loginSuccess = false;
      this.loginError = 'Unable to verify your token. Use HTTPS or localhost, or contact support to check the authentication data.';
    } finally {
      this.isLoggingIn = false;
    }
  }
}
