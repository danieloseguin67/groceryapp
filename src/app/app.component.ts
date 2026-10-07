import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GoogleDriveService } from './services/google-drive.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { LanguageService, TextKey, TextParams } from './services/language.service';

interface GroceryItem {
  Category: string;
  'Product Name': string;
  Brand?: string;
  'Size / Details': string;
  Quantity: number;
  'Price (CAD)': number;
  'Picked Up': boolean;
}

interface GrocerySummary {
  date: string;
  estimatedCost: number;
  actualCost: number;
  store: string;
  reason?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
      // Sum each item's quantity multiplied by its price, regardless of checked state.
      getTotalPriceColumn(): number {
        return this.groceryData.reduce((total, item) => {
          return total + (item.Quantity * item['Price (CAD)']);
        }, 0);
      }
    // ...existing code...

    // Track sort direction for toggling
    private sortCategoryAsc: boolean = true;
    private sortProductNameAsc: boolean = true;
  get title(): string { return this.t('Grocery Manager'); }
  customerName: string = '';
  groceryData: GroceryItem[] = [];
  filteredData: GroceryItem[] = [];
  displayedData: GroceryItem[] = [];
  searchTerm: string = '';
  showOnlyUnpicked: boolean = false;
  isAuthenticated: boolean = false;
  isLoginPage: boolean = false;
  // Language toggle
  get currentLanguage(): 'en' | 'fr' { return this.language.currentLanguage; }
  private languageSubscription: Subscription;

  t(key: TextKey, params: TextParams = {}): string {
    return this.language.text(key, params);
  }

  buttonLabel(label: TextKey): string { return this.t(label); }
  money(value: number): string { return this.language.currency(value); }
  formatDate(value: string): string { return this.language.date(value); }

  // Support modal
  showSupportModal: boolean = false;
  supportName: string = '';
  supportPhone: string = '';
  supportEmail: string = '';
  supportMessage: string = '';
  
  // Mobile menu
  showMobileMenu: boolean = false;
  
  // Summary Report Modal
  showSummaryModal: boolean = false;
  summaryDate: string = '';
  summaryActualCost: number = 0;
  summaryStore: string = 'Super C';
  summaryReason: string = '';
  grocerySummaries: GrocerySummary[] = [];
  
  // Statistics Modal
  showStatisticsModal: boolean = false;
  statisticsChart: Chart | null = null;
  @ViewChild('statisticsCanvas') statisticsCanvas?: ElementRef<HTMLCanvasElement>;
  // Fallback overlay when template isn't rendering
  private tempStatsOverlay?: HTMLElement;
  
  // Help Modal
  showHelpModal: boolean = false;
  private tempHelpOverlay?: HTMLElement;

  get helpTitle(): string {
    return this.t('Grocery Manager Help Guide');
  }
  
  // About Solution Modal
  showAboutModal: boolean = false;
  private tempAboutOverlay?: HTMLElement;
  
  // Google Drive Integration
  isGoogleSignedIn: boolean = false;
  isLoadingDrive: boolean = false;
  private driveMessageKey: TextKey | '' = '';
  private driveMessageParams: TextParams = {};
  get driveOperationMessage(): string {
    return this.driveMessageKey ? this.t(this.driveMessageKey, this.driveMessageParams) : '';
  }
  private setDriveMessage(key: TextKey | '', params: TextParams = {}): void {
    this.driveMessageKey = key;
    this.driveMessageParams = params;
  }
  
  // Store options
  stores: string[] = [];
  
  // Expose Math to template
  Math = Math;
  
  // Category dropdown options (loaded from assets/category.json)
  categories: string[] = [];
  private categoryJsonPath = 'assets/category.json';
  private storesJsonPath = 'assets/stores.json';
  private categoryData: Array<{ id: string; en: string; fr: string }> = [];
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  // Local JSON file paths
  private localJsonPath = 'assets/grocery-data.json';
  private summariesJsonPath = 'assets/grocery-summaries.json';
  // Initialization guard to ensure data loads once post-authentication
  private initialized: boolean = false;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private driveService: GoogleDriveService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    public language: LanguageService
  ) {
    this.languageSubscription = this.language.changes.subscribe(() => {
      this.refreshCategoryLabels();
      this.normalizeCategories();
      const page = this.currentPage;
      this.onSearch();
      this.currentPage = Math.min(page, Math.max(1, this.totalPages));
      this.updatePagination();
      if (this.tempHelpOverlay) {
        this.tempHelpOverlay.remove();
        this.tempHelpOverlay = undefined;
        this.createTemporaryHelpOverlay();
      }
      if (this.tempAboutOverlay) {
        this.tempAboutOverlay.remove();
        this.tempAboutOverlay = undefined;
        this.createTemporaryAboutOverlay();
      }
      if (this.tempStatsOverlay) {
        this.tempStatsOverlay.remove();
        this.tempStatsOverlay = undefined;
        this.createTemporaryStatisticsOverlay();
      }
      if (this.showStatisticsModal) this.createStatisticsChart();
    });
    this.router.events.subscribe(() => {
      this.isLoginPage = this.router.url === '/login';
      this.isAuthenticated = !!localStorage.getItem('customerId');

      // If user just logged in and navigated to main app, initialize data once
      if (this.isAuthenticated && !this.isLoginPage && !this.initialized) {
        this.initialized = true;
        this.loadCustomerName();
        this.loadCategories().then(() => {
          this.loadStores().then(() => {
            this.loadJsonData();
            this.loadSummaries();
          });
        });
      }
    });

    // Check Google sign-in status
    this.isGoogleSignedIn = this.driveService.isSignedIn();
  }

  ngOnDestroy(): void {
    this.languageSubscription.unsubscribe();
    this.statisticsChart?.destroy();
  }

  ngOnInit(): void {
    this.isAuthenticated = !!localStorage.getItem('customerId');
    this.isLoginPage = this.router.url === '/login';

    if (!this.isAuthenticated) {
      // Not authenticated, go to login
      this.router.navigate(['/login']);
      return;
    }

    if (this.isAuthenticated && !this.isLoginPage) {
      // Load customer name
      this.loadCustomerName();
      // Load categories and stores first
      this.initialized = true;
      this.loadCategories().then(() => {
        this.loadStores().then(() => {
          this.loadJsonData();
          this.loadSummaries();
        });
      });
    }
  }

  // Load customer name from customers.json using customerId from localStorage
  loadCustomerName(): void {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      this.customerName = '';
      return;
    }
    this.http.get<any[]>('assets/customers.json').subscribe({
      next: (customers) => {
        const customer = customers.find(c => c.customer_id === customerId);
        this.customerName = customer ? customer.customer_name : '';
      },
      error: () => {
        this.customerName = '';
      }
    });
  }

  // Load stores from stores.json
  loadStores(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<string[]>(this.storesJsonPath)
        .subscribe({
          next: (data) => {
            this.stores = data;
            resolve();
          },
          error: () => {
            // Fallback to built-in set if asset missing
            this.stores = [
              'Super C',
              'Metro',
              'IGA',
              'Maxi',
              'Provigo',
              'Loblaws',
              'Real Canadian Superstore',
              'No Frills',
              'Zehrs',
              'Fortinos',
              'Food Basics',
              'Sobeys',
              'Safeway',
              'FreshCo',
              'Save-On-Foods',
              'Thrifty Foods',
              'Co-op',
              'Walmart Supercentre',
              'Costco Wholesale',
              'Giant Tiger',
              'Longo’s',
              'Farm Boy',
              'Whole Foods Market'
            ];
            resolve();
          }
        });
    });
  }
  // ==================== Categories & Language ====================
  async loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<{ categories: Array<{ id: string; en: string; fr: string }> }>(this.categoryJsonPath)
        .subscribe({
          next: (data) => {
            this.categoryData = data.categories || [];
            this.refreshCategoryLabels();
            resolve();
          },
          error: () => {
            // Fallback to built-in set if asset missing
            this.categoryData = [
              { id: 'produce', en: 'Fruits & Vegetables', fr: 'Fruits et légumes' },
              { id: 'dairy-eggs', en: 'Dairy & Eggs', fr: 'Produits laitiers et œufs' },
              { id: 'pantry', en: 'Pantry', fr: 'Garde-Manger' },
              { id: 'beverages', en: 'Beverages', fr: 'Boissons' },
              { id: 'meat-poultry', en: 'Meat & Poultry', fr: 'Viandes et volailles' },
              { id: 'snacks', en: 'Snacks', fr: 'Collations' },
              { id: 'frozen', en: 'Frozen Foods', fr: 'Produits surgelés' },
              { id: 'bakery', en: 'Bread & Bakery', fr: 'Pains et pâtisseries' },
              { id: 'household', en: 'Household', fr: 'Entretien ménager' }
            ];
            this.refreshCategoryLabels();
            resolve();
          }
        });
    });
  }

  private refreshCategoryLabels(): void {
    this.categories = this.categoryData.map(c => this.currentLanguage === 'en' ? c.en : c.fr);
  }

  private normalizeCategories(): void {
    this.groceryData.forEach(item => {
      item.Category = this.translateCategoryValue(item.Category, this.currentLanguage);
    });
  }

  private translateCategoryValue(value: string, targetLang: 'en' | 'fr'): string {
    const found = this.categoryData.find(c => c.en === value || c.fr === value);
    if (!found) return value;
    return targetLang === 'en' ? found.en : found.fr;
  }

  toggleLanguage(): void {
    this.language.toggle();
  }


  logout(): void {
    localStorage.removeItem('customerId');
    this.isAuthenticated = false;
    this.router.navigate(['/login']);
  }

  loadJsonData(): void {
    // Try loading from localStorage first
    const savedData = localStorage.getItem('grocery-data');
    
    if (savedData) {
      console.log('✅ Loading data from browser storage');
      this.processJsonData(JSON.parse(savedData));
    } else {
      // Fallback to loading from assets folder (initial load)
      this.http.get<any[]>(this.localJsonPath)
        .subscribe({
          next: (jsonData) => {
            console.log('✅ Successfully loaded JSON file from assets folder');
            this.processJsonData(jsonData);
          },
          error: (error) => {
            console.error('❌ Error loading JSON file:', error);
            alert(this.t('JSON file not found in assets folder.\n\nPlease ensure grocery-data.json exists in src/assets/ folder'));
          }
        });
    }
  }

  loadSummaries(): void {
    const savedSummaries = localStorage.getItem('grocery-summaries');
    const customerId = localStorage.getItem('customerId');
    
    if (savedSummaries) {
      const allSummaries = JSON.parse(savedSummaries);
      // Filter summaries by customer_id
      this.grocerySummaries = allSummaries.filter((s: any) => s.customer_id === customerId);
      console.log('✅ Successfully loaded summaries from browser storage');
      console.log(`Number of summaries loaded for ${customerId}:`, this.grocerySummaries.length);
      console.log('Summaries:', this.grocerySummaries);
    } else {
      // Fallback to loading from assets folder (initial load)
      this.http.get<GrocerySummary[]>(this.summariesJsonPath)
        .subscribe({
          next: (summaries) => {
            // Filter by customer_id
            this.grocerySummaries = summaries.filter((s: any) => s.customer_id === customerId);
            console.log('✅ Successfully loaded summaries from assets');
          },
          error: (error) => {
            console.log('ℹ️ No existing summaries found (this is normal for first time)');
            this.grocerySummaries = [];
          }
        });
    }
  }

  processJsonData(jsonData: any[]): void {
    // Filter data by logged-in customer ID
    const customerId = localStorage.getItem('customerId');
    if (customerId) {
      this.groceryData = jsonData.filter(item => item.customer_id === customerId);
      console.log(`Filtered ${this.groceryData.length} items for customer: ${customerId}`);
    } else {
      this.groceryData = jsonData;
    }
    
    this.normalizeCategories();
    this.onSearch();
  }

  onSearch(): void {
    let results = [...this.groceryData];
    
    // Apply text search
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      results = results.filter(item => {
        return (
          item.Category?.toLowerCase().includes(searchLower) ||
          item['Product Name']?.toLowerCase().includes(searchLower) ||
          item.Brand?.toLowerCase().includes(searchLower) ||
          item['Size / Details']?.toLowerCase().includes(searchLower) ||
          item.Quantity?.toString().includes(searchLower) ||
          item['Price (CAD)']?.toString().includes(searchLower)
        );
      });
    }
    
    // Apply unpicked filter
    if (this.showOnlyUnpicked) {
      results = results.filter(item => !item['Picked Up']);
    }
    
    this.filteredData = results;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedData = this.filteredData.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage(): void {
    this.onPageChange(this.currentPage - 1);
  }

  nextPage(): void {
    this.onPageChange(this.currentPage + 1);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  addNewRow(): void {
    const customerId = localStorage.getItem('customerId') || '';
    const newItem: GroceryItem = {
      Category: this.categories[0] || '',
      'Product Name': '',
      Brand: '',
      'Size / Details': '',
      Quantity: 1,
      'Price (CAD)': 0,
      'Picked Up': false
    };
    
    // Add customer_id to the new item
    (newItem as any).customer_id = customerId;
    
    this.groceryData.unshift(newItem);
    this.filteredData = [...this.groceryData];
    this.currentPage = 1;
    this.updatePagination();
  }

  togglePickedUp(item: GroceryItem): void {
    item['Picked Up'] = !item['Picked Up'];
  }

  deleteRow(item: GroceryItem): void {
    if (confirm(this.t('Are you sure you want to delete this item?'))) {
      const index = this.groceryData.indexOf(item);
      if (index > -1) {
        this.groceryData.splice(index, 1);
        this.filteredData = [...this.groceryData];
        this.updatePagination();
      }
    }
  }

  openSummaryReport(): void {
    this.showSummaryModal = true;
    // Set default date to today
    const today = new Date();
    this.summaryDate = today.toISOString().split('T')[0];
    this.summaryActualCost = 0;
    this.summaryStore = 'Super C';
  }

  openStatisticsModal(): void {
    console.log('STATISTICS CLICKED');
    console.log('showStatisticsModal BEFORE:', this.showStatisticsModal);
    console.log('isAuthenticated:', this.isAuthenticated);
    
    this.showStatisticsModal = true;
    
    console.log('showStatisticsModal AFTER:', this.showStatisticsModal);
    
    // Register Chart.js components
    Chart.register(...registerables);
    
    this.cdr.detectChanges();
    
    // Check DOM after 1 second
    setTimeout(() => {
      console.log('Checking DOM...');
      console.log('Modal overlay:', document.querySelector('.modal-overlay'));
      console.log('Canvas:', document.getElementById('statisticsChart'));
    }, 1000);
    
    // Wait for Angular to finish rendering
    this.ngZone.onStable.pipe(
      take(1)
    ).subscribe(() => {
      setTimeout(() => {
        this.createStatisticsChart();
      }, 100);
    });
  }

  closeStatisticsModal(): void {
    // Destroy chart before closing modal
    if (this.statisticsChart) {
      this.statisticsChart.destroy();
      this.statisticsChart = null;
    }
    // Remove any programmatically created overlay
    if (this.tempStatsOverlay) {
      try {
        document.body.removeChild(this.tempStatsOverlay);
      } catch {}
      this.tempStatsOverlay = undefined;
    }
    this.showStatisticsModal = false;
  }



  createStatisticsChart(): void {
    // Destroy existing chart if any
    if (this.statisticsChart) {
      this.statisticsChart.destroy();
    }
    
    let canvas = document.getElementById('statisticsChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found');
      // Fallback: create a minimal overlay with canvas so chart can render
      this.createTemporaryStatisticsOverlay();
      canvas = document.getElementById('statisticsChart') as HTMLCanvasElement;
      if (!canvas) {
        // If still not found, abort
        return;
      }
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2D context');
      return;
    }
    
    // Prepare data by date and store
    const dataByDate: { [key: string]: { [store: string]: { estimated: number, actual: number } } } = {};
    
    this.grocerySummaries.forEach(summary => {
      if (!dataByDate[summary.date]) {
        dataByDate[summary.date] = {};
      }
      if (!dataByDate[summary.date][summary.store]) {
        dataByDate[summary.date][summary.store] = { estimated: 0, actual: 0 };
      }
      dataByDate[summary.date][summary.store].estimated += summary.estimatedCost;
      dataByDate[summary.date][summary.store].actual += summary.actualCost;
    });
    
    // Get unique dates and stores, sorted
    const dates = Object.keys(dataByDate).sort();
    const stores = Array.from(new Set(this.grocerySummaries.map(s => s.store)));
    
    // Prepare datasets for chart
    const datasets: any[] = [];
    const colors = [
      { estimated: 'rgba(54, 162, 235, 0.6)', actual: 'rgba(255, 99, 132, 0.6)' },
      { estimated: 'rgba(75, 192, 192, 0.6)', actual: 'rgba(255, 159, 64, 0.6)' },
      { estimated: 'rgba(153, 102, 255, 0.6)', actual: 'rgba(255, 205, 86, 0.6)' },
      { estimated: 'rgba(201, 203, 207, 0.6)', actual: 'rgba(255, 99, 71, 0.6)' }
    ];
    
    stores.forEach((store, idx) => {
      const colorSet = colors[idx % colors.length];
      
      // Estimated cost dataset for this store
      datasets.push({
        label: `${store} - ${this.t('Estimated')}`,
        data: dates.map(date => dataByDate[date][store]?.estimated || 0),
        backgroundColor: colorSet.estimated,
        borderColor: colorSet.estimated.replace('0.6', '1'),
        borderWidth: 2
      });
      
      // Actual cost dataset for this store
      datasets.push({
        label: `${store} - ${this.t('Actual')}`,
        data: dates.map(date => dataByDate[date][store]?.actual || 0),
        backgroundColor: colorSet.actual,
        borderColor: colorSet.actual.replace('0.6', '1'),
        borderWidth: 2
      });
    });
    
    // Create chart
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: dates.map(date => this.formatDate(date)),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: this.t('Grocery Costs: Estimated vs Actual by Date and Store'),
            font: {
              size: 16
            }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed && context.parsed.y !== null && context.parsed.y !== undefined) {
                  label += this.money(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: this.t('Date')
            }
          },
          y: {
            title: {
              display: true,
              text: this.t('Cost (CAD)')
            },
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return this.money(Number(value));
              }
            }
          }
        }
      }
    };
    
    this.statisticsChart = new Chart(ctx, config);
  }

  // Create a temporary modal overlay in the DOM if Angular template isn't present
  private createTemporaryStatisticsOverlay(): void {
    if (this.tempStatsOverlay) {
      return;
    }
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.addEventListener('click', () => this.closeStatisticsModal());

    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.padding = '24px';
    content.style.borderRadius = '12px';
    content.style.maxWidth = '1000px';
    content.style.width = '90%';
    content.style.maxHeight = '80vh';
    content.style.overflowY = 'auto';
    content.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    const h2 = document.createElement('h2');
    h2.textContent = this.t('Grocery Statistics');
    const closeBtn = document.createElement('button');
    closeBtn.textContent = this.buttonLabel('Close');
    closeBtn.style.marginLeft = '12px';
    closeBtn.addEventListener('click', () => this.closeStatisticsModal());
    header.appendChild(h2);
    header.appendChild(closeBtn);

    const chartContainer = document.createElement('div');
    chartContainer.style.height = '500px';
    chartContainer.style.background = 'white';
    chartContainer.style.marginTop = '12px';
    const canvas = document.createElement('canvas');
    canvas.id = 'statisticsChart';
    chartContainer.appendChild(canvas);

    content.appendChild(header);
    content.appendChild(chartContainer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.tempStatsOverlay = overlay;
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }

  getEstimatedCost(): number {
    return this.groceryData.reduce((total, item) => {
      // Only include items that were picked up
      if (item['Picked Up']) {
        return total + (item['Price (CAD)'] * item.Quantity);
      }
      return total;
    }, 0);
  }

  // Estimate the cost of picked-up items on the currently displayed page.
  getEstimatedCostForDisplayed(): number {
    return this.displayedData.reduce((total, item) => {
      if (item['Picked Up']) {
        return total + (item['Price (CAD)'] * item.Quantity);
      }
      return total;
    }, 0);
  }

  // Sort by Category and Product Name (primary: category, secondary: product name)
  sortByCategoryAndProductName(): void {
    this.filteredData.sort((a, b) => {
      const catCmp = (a.Category || '').localeCompare(b.Category || '', this.language.locale);
      if (catCmp !== 0) return catCmp;
      return (a['Product Name'] || '').localeCompare(b['Product Name'] || '', this.language.locale);
    });
    this.currentPage = 1;
    this.updatePagination();
  }
  // Sort by Category (toggle asc/desc)
  sortByCategory(): void {
    this.filteredData.sort((a, b) => {
      const cmp = (a.Category || '').localeCompare(b.Category || '', this.language.locale);
      return this.sortCategoryAsc ? cmp : -cmp;
    });
    this.sortCategoryAsc = !this.sortCategoryAsc;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Sort by Product Name (toggle asc/desc)
  sortByProductName(): void {
    this.filteredData.sort((a, b) => {
      const cmp = (a['Product Name'] || '').localeCompare(b['Product Name'] || '', this.language.locale);
      return this.sortProductNameAsc ? cmp : -cmp;
    });
    this.sortProductNameAsc = !this.sortProductNameAsc;
    this.currentPage = 1;
    this.updatePagination();
  }

  saveSummary(): void {
    const summary: GrocerySummary = {
      date: this.summaryDate,
      estimatedCost: this.getEstimatedCost(),
      actualCost: this.summaryActualCost,
      store: this.summaryStore,
      reason: this.summaryReason
    };

    // Add customer_id to the summary
    const customerId = localStorage.getItem('customerId');
    (summary as any).customer_id = customerId;

    this.grocerySummaries.push(summary);
    
    // Save to browser localStorage
    try {
      localStorage.setItem('grocery-summaries', JSON.stringify(this.grocerySummaries));
      console.log('✅ Summary saved successfully to browser storage');
      console.log('Total summaries now:', this.grocerySummaries.length);
      console.log('Saved data:', this.grocerySummaries);
      console.log('localStorage content:', localStorage.getItem('grocery-summaries'));
      alert(this.t('Summary saved to browser storage!\n\nDate: {date}\nStore: {store}\nEstimated: {estimated}\nActual: {actual}\nDifference: {difference}\nReason: {reason}\n\nYour summary is now saved in browser storage and will appear in Statistics.', {
        date: this.formatDate(summary.date), store: summary.store,
        estimated: this.money(summary.estimatedCost), actual: this.money(summary.actualCost),
        difference: this.money(summary.actualCost - summary.estimatedCost), reason: summary.reason || ''
      }));
      this.closeSummaryModal();
    } catch (error) {
      console.error('❌ Error saving summary:', error);
      alert(this.t('Failed to save summary to browser storage.'));
    }
  }

  saveToExcel(): void {
    // Save all data to browser localStorage
    try {
      localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
      console.log('✅ Data saved successfully to browser storage');
      alert(this.t('Data saved successfully to browser storage!'));
    } catch (error) {
      console.error('❌ Error saving data:', error);
      alert(this.t('Failed to save data to browser storage.'));
    }
  }

  downloadGroceryData(): void {
    try {
      const dataStr = JSON.stringify(this.groceryData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      const customerId = localStorage.getItem('customerId') || 'user';
      link.download = `grocery-data-${customerId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      console.log('✅ Grocery data downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading grocery data:', error);
      alert(this.t('Failed to download grocery data.'));
    }
  }

  downloadSummaries(): void {
    try {
      const dataStr = JSON.stringify(this.grocerySummaries, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      const customerId = localStorage.getItem('customerId') || 'user';
      link.download = `grocery-summaries-${customerId}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      console.log('✅ Grocery summaries downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading summaries:', error);
      alert(this.t('Failed to download summaries.'));
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  // ==================== Google Drive Methods ====================

  async signInToGoogle(): Promise<void> {
    try {
      this.isLoadingDrive = true;
      this.setDriveMessage('Signing in to Google...');
      await this.driveService.authenticate();
      this.isGoogleSignedIn = true;
      this.setDriveMessage('Successfully signed in to Google Drive');
      setTimeout(() => this.setDriveMessage(''), 3000);
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error);
      
      // Show user-friendly error message
      let errorKey: TextKey;
      if (error?.message?.includes('not configured')) {
        errorKey = 'Sign-in failed. Google Drive is not set up. See QUICK_START.md for setup instructions.';
      } else if (error?.message?.includes('not loaded')) {
        errorKey = 'Sign-in failed. Google API could not be loaded. Please refresh the page.';
      } else {
        errorKey = 'Sign-in failed. Please check your internet connection and try again.';
      }
      
      this.setDriveMessage(errorKey);
      alert(this.t(errorKey));
      setTimeout(() => this.setDriveMessage(''), 8000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  signOutFromGoogle(): void {
    this.driveService.signOut();
    this.isGoogleSignedIn = false;
    this.setDriveMessage('Signed out from Google Drive');
    setTimeout(() => this.setDriveMessage(''), 3000);
  }

  async saveGroceryDataToDrive(): Promise<void> {
    try {
      if (!this.isGoogleSignedIn) {
        await this.signInToGoogle();
        if (!this.isGoogleSignedIn) return;
      }

      this.isLoadingDrive = true;
      this.setDriveMessage('Opening folder picker...');

      // Get or create GroceryManager folder
      const folderId = await this.driveService.getOrCreateGroceryManagerFolder();
      
      if (!folderId) {
        this.setDriveMessage('Folder selection cancelled');
        setTimeout(() => this.setDriveMessage(''), 3000);
        return;
      }

      this.setDriveMessage('Uploading grocery data...');
      const customerId = localStorage.getItem('customerId') || 'user';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `grocery-data-${customerId}-${timestamp}.json`;

      await this.driveService.uploadJsonFile(folderId, filename, this.groceryData);
      
      this.setDriveMessage('Grocery data saved to Drive: {file}', { file: filename });
      setTimeout(() => this.setDriveMessage(''), 5000);
    } catch (error) {
      console.error('❌ Error saving to Drive:', error);
      this.setDriveMessage('Failed to save to Drive. Please try again.');
      setTimeout(() => this.setDriveMessage(''), 5000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  async saveSummariesToDrive(): Promise<void> {
    try {
      if (!this.isGoogleSignedIn) {
        await this.signInToGoogle();
        if (!this.isGoogleSignedIn) return;
      }

      this.isLoadingDrive = true;
      this.setDriveMessage('Opening folder picker...');

      // Get or create GroceryManager folder
      const folderId = await this.driveService.getOrCreateGroceryManagerFolder();
      
      if (!folderId) {
        this.setDriveMessage('Folder selection cancelled');
        setTimeout(() => this.setDriveMessage(''), 3000);
        return;
      }

      this.setDriveMessage('Uploading summaries...');
      const customerId = localStorage.getItem('customerId') || 'user';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `grocery-summaries-${customerId}-${timestamp}.json`;

      await this.driveService.uploadJsonFile(folderId, filename, this.grocerySummaries);
      
      this.setDriveMessage('Summaries saved to Drive: {file}', { file: filename });
      setTimeout(() => this.setDriveMessage(''), 5000);
    } catch (error) {
      console.error('❌ Error saving to Drive:', error);
      this.setDriveMessage('Failed to save to Drive. Please try again.');
      setTimeout(() => this.setDriveMessage(''), 5000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  async loadGroceryDataFromDrive(): Promise<void> {
    try {
      if (!this.isGoogleSignedIn) {
        await this.signInToGoogle();
        if (!this.isGoogleSignedIn) return;
      }

      this.isLoadingDrive = true;
      this.setDriveMessage('Opening file picker...');

      const files = await this.driveService.openFilePicker('application/json');
      
      if (!files || files.length === 0) {
        this.setDriveMessage('No file selected');
        setTimeout(() => this.setDriveMessage(''), 3000);
        return;
      }

      this.setDriveMessage('Downloading grocery data...');
      const fileData = await this.driveService.downloadJsonFile(files[0].id);
      
      // Validate and load data
      if (Array.isArray(fileData)) {
        this.groceryData = fileData;
        this.normalizeCategories();
        this.onSearch();
        
        // Save to localStorage as well
        localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
        
        this.setDriveMessage('Loaded {count} items from Drive', { count: fileData.length });
        setTimeout(() => this.setDriveMessage(''), 5000);
      } else {
        throw new Error('Invalid grocery data format');
      }
    } catch (error) {
      console.error('❌ Error loading from Drive:', error);
      this.setDriveMessage('Failed to load from Drive. Please try again.');
      setTimeout(() => this.setDriveMessage(''), 5000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  async loadSummariesFromDrive(): Promise<void> {
    try {
      if (!this.isGoogleSignedIn) {
        await this.signInToGoogle();
        if (!this.isGoogleSignedIn) return;
      }

      this.isLoadingDrive = true;
      this.setDriveMessage('Opening file picker...');

      const files = await this.driveService.openFilePicker('application/json');
      
      if (!files || files.length === 0) {
        this.setDriveMessage('No file selected');
        setTimeout(() => this.setDriveMessage(''), 3000);
        return;
      }

      this.setDriveMessage('Downloading summaries...');
      const fileData = await this.driveService.downloadJsonFile(files[0].id);
      
      // Validate and load data
      if (Array.isArray(fileData)) {
        this.grocerySummaries = fileData;
        
        // Save to localStorage as well
        localStorage.setItem('grocery-summaries', JSON.stringify(this.grocerySummaries));
        
        this.setDriveMessage('Loaded {count} summaries from Drive', { count: fileData.length });
        setTimeout(() => this.setDriveMessage(''), 5000);
      } else {
        throw new Error('Invalid summaries data format');
      }
    } catch (error) {
      console.error('❌ Error loading from Drive:', error);
      this.setDriveMessage('Failed to load from Drive. Please try again.');
      setTimeout(() => this.setDriveMessage(''), 5000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  // ==================== Local File Upload Methods ====================

  onUploadGroceryData(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          this.groceryData = data;
          this.normalizeCategories();
          this.onSearch();
          
          // Save to localStorage
          localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
          
          alert(this.t('Successfully uploaded {count} grocery items from {file}', { count: data.length, file: file.name }));
          console.log('✅ Grocery data uploaded:', data.length, 'items');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('❌ Error parsing grocery data file:', error);
        alert(this.t('Failed to upload file. Please ensure it is a valid JSON file.'));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  }

  onUploadSummaries(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          this.grocerySummaries = data;
          
          // Save to localStorage
          localStorage.setItem('grocery-summaries', JSON.stringify(this.grocerySummaries));
          
          alert(this.t('Successfully uploaded {count} summaries from {file}', { count: data.length, file: file.name }));
          console.log('✅ Summaries uploaded:', data.length, 'items');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('❌ Error parsing summaries file:', error);
        alert(this.t('Failed to upload file. Please ensure it is a valid JSON file.'));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  }

  // ==================== Help Modal Methods ====================

  openHelpModal(): void {
    console.log('HELP CLICKED');
    console.log('showHelpModal BEFORE:', this.showHelpModal);
    this.showHelpModal = true;
    console.log('showHelpModal AFTER:', this.showHelpModal);
    this.cdr.detectChanges();

    // If template doesn't render, create a temporary overlay
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      setTimeout(() => {
        const renderedHelp = document.querySelector('.modal-help');
        if (!renderedHelp) {
          this.createTemporaryHelpOverlay();
        }
      }, 100);
    });
  }

  closeHelpModal(): void {
    console.log('HELP CLOSE CLICKED');
    this.showHelpModal = false;
    if (this.tempHelpOverlay) {
      try {
        document.body.removeChild(this.tempHelpOverlay);
      } catch {}
      this.tempHelpOverlay = undefined;
    }
  }

  private createTemporaryHelpOverlay(): void {
    if (this.tempHelpOverlay) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.addEventListener('click', () => this.closeHelpModal());

    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.padding = '24px';
    content.style.borderRadius = '12px';
    content.style.maxWidth = '900px';
    content.style.width = '92%';
    content.style.maxHeight = '85vh';
    content.style.overflowY = 'auto';
    content.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    const h2 = document.createElement('h2');
    h2.textContent = this.helpTitle;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = this.buttonLabel('Close');
    closeBtn.addEventListener('click', () => this.closeHelpModal());
    header.appendChild(h2);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.innerHTML = this.currentLanguage === 'en' ? `
      <h3>Menu Options — English</h3>
      <ul>
        <li><strong>Add Item:</strong> Adds a blank row for category, product, brand, size/details, quantity, and CAD price.</li>
        <li><strong>Language:</strong> Switches the entire interface and this guide between English and French, including login, forms, messages, and statistics. Your selection is remembered in this browser. Product names, brands, store names, and your notes are not automatically translated.</li>
        <li><strong>Summary Report:</strong> Views saved reports and adds a report with date, store, actual cost, and optional reason. Estimated cost uses picked-up items.</li>
        <li><strong>Statistics:</strong> Charts estimated and actual costs from saved summaries.</li>
        <li><strong>Help:</strong> Opens this guide. <strong>About Solution:</strong> Shows app information.</li>
        <li><strong>Save:</strong> Saves the grocery list in this browser on this device. Reports are saved when added.</li>
        <li><strong>Download Data / Download Summaries:</strong> Downloads JSON backups of the grocery list and reports.</li>
        <li><strong>Upload Data / Upload Summaries:</strong> Imports grocery-list or report JSON files.</li>
        <li><strong>Logout:</strong> Signs out and returns to the login screen. On mobile, open the ☰ menu to access the actions.</li>
      </ul>
      <h3>Shopping List Controls — English</h3>
      <ul>
        <li>Edit item fields directly in the table; mark bought items as Picked Up or delete them with the trash button.</li>
        <li>Search, filter to show only unpicked items, and sort by category or product name. Click a sort button again to reverse the order.</li>
        <li>Use Previous and Next to change pages. The estimated cost includes quantity times price only for picked-up items on the displayed page. The price column sum includes quantity times price for all items regardless of pickup status.</li>
      </ul>
      <h3>Backups and Transfers</h3>
      <p>Browser storage is specific to this device. Download JSON backups regularly and upload them on another device; you can transfer the files using Google Drive.</p>
    ` : `
      <h3>Options du menu — Français</h3>
      <ul>
        <li><strong>Ajouter un article :</strong> Ajoute une ligne pour la catégorie, le produit, la marque, le format ou les détails, la quantité et le prix en dollars canadiens.</li>
        <li><strong>Langue :</strong> Change toute l’interface et ce guide entre l’anglais et le français, y compris la connexion, les formulaires, les messages et les statistiques. Votre choix est conservé dans ce navigateur. Les noms de produits, les marques, les magasins et vos notes ne sont pas traduits automatiquement.</li>
        <li><strong>Rapport sommaire :</strong> Affiche les rapports enregistrés et permet d’en ajouter un avec la date, le magasin, le coût réel et une raison facultative. Le coût estimé utilise les articles ramassés.</li>
        <li><strong>Statistiques :</strong> Présente un graphique des coûts estimés et réels des rapports enregistrés.</li>
        <li><strong>Aide :</strong> Ouvre ce guide. <strong>À propos :</strong> Affiche des renseignements sur l’application.</li>
        <li><strong>Enregistrer :</strong> Enregistre la liste dans le navigateur de cet appareil. Les rapports sont enregistrés lorsqu’ils sont ajoutés.</li>
        <li><strong>Télécharger les données / Télécharger les rapports :</strong> Télécharge des sauvegardes JSON de la liste et des rapports.</li>
        <li><strong>Importer les données / Importer les rapports :</strong> Importe des fichiers JSON de liste ou de rapports.</li>
        <li><strong>Déconnexion :</strong> Ferme la session et retourne à l’écran de connexion. Sur mobile, ouvrez le menu ☰ pour accéder aux actions.</li>
      </ul>
      <h3>Commandes de la liste — Français</h3>
      <ul>
        <li>Modifiez les champs directement dans le tableau; cochez Ramassé pour les articles achetés ou utilisez la corbeille pour les supprimer.</li>
        <li>Recherchez, filtrez pour afficher uniquement les articles non ramassés et triez par catégorie ou nom de produit. Cliquez de nouveau sur un tri pour inverser l’ordre.</li>
        <li>Utilisez Précédent et Suivant pour changer de page, Ajouter un rapport pour enregistrer un rapport et Fermer pour quitter une fenêtre. Les totaux indiquent les articles correspondants, le coût estimé des articles affichés et la somme de la colonne Prix pour tous les articles, qu’ils soient ramassés ou non.</li>
      </ul>
      <h3>Sauvegardes et transfert</h3>
      <p>Le stockage du navigateur est propre à cet appareil. Téléchargez régulièrement des sauvegardes JSON et importez-les sur un autre appareil; vous pouvez transférer les fichiers avec Google Drive.</p>
    `;

    content.appendChild(header);
    content.appendChild(body);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.tempHelpOverlay = overlay;
  }

  // ==================== About Modal Methods ====================

  openAboutModal(): void {
    console.log('ABOUT CLICKED');
    console.log('showAboutModal BEFORE:', this.showAboutModal);
    this.showAboutModal = true;
    console.log('showAboutModal AFTER:', this.showAboutModal);
    this.cdr.detectChanges();

    // If template doesn't render, create a temporary overlay
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      setTimeout(() => {
        const renderedAbout = document.querySelector('.modal-about');
        if (!renderedAbout) {
          this.createTemporaryAboutOverlay();
        }
      }, 100);
    });
  }

  closeAboutModal(): void {
    this.showAboutModal = false;
    if (this.tempAboutOverlay) {
      try {
        document.body.removeChild(this.tempAboutOverlay);
      } catch {}
      this.tempAboutOverlay = undefined;
    }
  }

  private createTemporaryAboutOverlay(): void {
    if (this.tempAboutOverlay) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.addEventListener('click', () => this.closeAboutModal());

    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.padding = '24px';
    content.style.borderRadius = '12px';
    content.style.maxWidth = '600px';
    content.style.width = '90%';
    content.style.maxHeight = '80vh';
    content.style.overflowY = 'auto';
    content.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    const h2 = document.createElement('h2');
    h2.textContent = this.t('About Solution');
    const closeBtn = document.createElement('button');
    closeBtn.textContent = this.buttonLabel('Close');
    closeBtn.addEventListener('click', () => this.closeAboutModal());
    header.appendChild(h2);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    const description = document.createElement('p');
    description.textContent = this.t('Grocery Manager was developed by Daniel Seguin of SeguinDev in January 2026.');
    body.appendChild(description);

    content.appendChild(header);
    content.appendChild(body);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.tempAboutOverlay = overlay;
  }

  // ==================== Support Modal Methods ====================

  onSupportClick(event: MouseEvent): void {
    // Prevent navigation and stop event from reaching content scripts
    event.preventDefault();
    try { (event as any).stopImmediatePropagation?.(); } catch {}
    event.stopPropagation();
    this.openSupportModal();
  }

  openSupportModal(): void {
    this.showSupportModal = true;
  }

  closeSupportModal(): void {
    this.showSupportModal = false;
  }

  sendSupportEmail(): void {
    const to = 'daniel@seguin.dev';
    const subject = encodeURIComponent(this.t('Grocery Manager Support'));
    const bodyLines = [
      `${this.t('Name')}: ${this.supportName}`,
      `${this.t('Phone')}: ${this.supportPhone}`,
      `${this.t('Email')}: ${this.supportEmail}`,
      '',
      `${this.t('Message')}:`,
      this.supportMessage || ''
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    this.closeSupportModal();
  }
}
