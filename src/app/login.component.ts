import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  private customers: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any[]>('assets/customers.json').subscribe({
      next: (data) => {
        this.customers = data;
        console.log('Customers loaded:', this.customers);
      },
      error: (error) => {
        console.error('Error loading customers data:', error);
        this.loginError = 'Failed to load authentication data.';
      }
    });
  }

  onLogin() {
    console.log('Login attempt:', { customerId: this.customerId, appToken: this.appToken });
    console.log('Available customers:', this.customers);
    
    if (this.customers.length === 0) {
      this.loginError = 'Authentication data not loaded yet. Please try again.';
      return;
    }

    const customer = this.customers.find(
      c => c.customer_id === this.customerId && c.apptoken === this.appToken
    );
    
    console.log('Customer found:', customer);
    
    if (customer) {
      this.loginSuccess = true;
      this.loginError = '';
      localStorage.setItem('customerId', this.customerId);
      
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 300);
    } else {
      this.loginError = 'You have entered an incorrect Customer ID or Application Token. Please retry.';
      this.loginSuccess = false;
    }
  }
}
