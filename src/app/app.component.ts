import { Component, OnInit, ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { GoogleDriveService } from './services/google-drive.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { take } from 'rxjs/operators';

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
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'Grocery Manager';
  groceryData: GroceryItem[] = [];
  filteredData: GroceryItem[] = [];
  displayedData: GroceryItem[] = [];
  searchTerm: string = '';
  showOnlyUnpicked: boolean = false;
  isAuthenticated: boolean = false;
  isLoginPage: boolean = false;
  
  // Mobile menu
  showMobileMenu: boolean = false;
  
  // Summary Report Modal
  showSummaryModal: boolean = false;
  summaryDate: string = '';
  summaryActualCost: number = 0;
  summaryStore: string = 'Super C';
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
  
  // Google Drive Integration
  isGoogleSignedIn: boolean = false;
  isLoadingDrive: boolean = false;
  driveOperationMessage: string = '';
  
  // Store options
  stores: string[] = [
    'Super C',
    'Metro',
    'IGA',
    'Maxi',
    'Provigo',
    'Loblaws'
  ];
  
  // Expose Math to template
  Math = Math;
  
  // Category dropdown options
  categories: string[] = [
    'Fruits et légumes',
    'Produits laitiers et œufs',
    'Garde-Manger',
    'Boissons',
    'Viandes et volailles',
    'Collations',
    'Produits surgelés',
    'Pains et pâtisseries',
    'Entretien ménager'
  ];
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  
  // Local JSON file paths
  private localJsonPath = 'assets/grocery-data.json';
  private summariesJsonPath = 'assets/grocery-summaries.json';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private driveService: GoogleDriveService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.router.events.subscribe(() => {
      this.isLoginPage = this.router.url === '/login';
      this.isAuthenticated = !!localStorage.getItem('customerId');
    });
    
    // Check Google sign-in status
    this.isGoogleSignedIn = this.driveService.isSignedIn();
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
      // Authenticated and not on login page, load data
      this.loadJsonData();
      this.loadSummaries();
    }
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
            alert('JSON file not found in assets folder.\n\nPlease ensure grocery-data.json exists in src/assets/ folder');
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
    
    this.filteredData = [...this.groceryData];
    this.updatePagination();
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
      Category: 'Fruits et légumes',
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
    if (confirm('Are you sure you want to delete this item?')) {
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
        label: `${store} - Estimated`,
        data: dates.map(date => dataByDate[date][store]?.estimated || 0),
        backgroundColor: colorSet.estimated,
        borderColor: colorSet.estimated.replace('0.6', '1'),
        borderWidth: 2
      });
      
      // Actual cost dataset for this store
      datasets.push({
        label: `${store} - Actual`,
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
        labels: dates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Grocery Costs: Estimated vs Actual by Date and Store',
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
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed && context.parsed.y !== null && context.parsed.y !== undefined) {
                  label += '$' + context.parsed.y.toFixed(2);
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
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Cost (CAD)'
            },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
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
    h2.textContent = 'Grocery Statistics';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
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

  saveSummary(): void {
    const summary: GrocerySummary = {
      date: this.summaryDate,
      estimatedCost: this.getEstimatedCost(),
      actualCost: this.summaryActualCost,
      store: this.summaryStore
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
      alert(`✅ Summary saved to browser storage!\n\nDate: ${summary.date}\nStore: ${summary.store}\nEstimated: $${summary.estimatedCost.toFixed(2)}\nActual: $${summary.actualCost.toFixed(2)}\nDifference: $${(summary.actualCost - summary.estimatedCost).toFixed(2)}\n\nYour summary is now saved in browser storage and will appear in Statistics.`);
      this.closeSummaryModal();
    } catch (error) {
      console.error('❌ Error saving summary:', error);
      alert('Failed to save summary to browser storage.');
    }
  }

  saveToExcel(): void {
    // Save all data to browser localStorage
    try {
      localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
      console.log('✅ Data saved successfully to browser storage');
      alert('Data saved successfully to browser storage!');
    } catch (error) {
      console.error('❌ Error saving data:', error);
      alert('Failed to save data to browser storage.');
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
      alert('Failed to download grocery data.');
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
      alert('Failed to download summaries.');
    }
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }

  // ==================== Google Drive Methods ====================

  async signInToGoogle(): Promise<void> {
    try {
      this.isLoadingDrive = true;
      this.driveOperationMessage = 'Signing in to Google...';
      await this.driveService.authenticate();
      this.isGoogleSignedIn = true;
      this.driveOperationMessage = '✅ Successfully signed in to Google Drive';
      setTimeout(() => this.driveOperationMessage = '', 3000);
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error);
      
      // Show user-friendly error message
      let errorMessage = '❌ Sign-in failed. ';
      if (error?.message?.includes('not configured')) {
        errorMessage += 'Google Drive is not set up. See QUICK_START.md for setup instructions.';
      } else if (error?.message?.includes('not loaded')) {
        errorMessage += 'Google API could not be loaded. Please refresh the page.';
      } else {
        errorMessage += 'Please check your internet connection and try again.';
      }
      
      this.driveOperationMessage = errorMessage;
      alert(errorMessage);
      setTimeout(() => this.driveOperationMessage = '', 8000);
    } finally {
      this.isLoadingDrive = false;
    }
  }

  signOutFromGoogle(): void {
    this.driveService.signOut();
    this.isGoogleSignedIn = false;
    this.driveOperationMessage = '✅ Signed out from Google Drive';
    setTimeout(() => this.driveOperationMessage = '', 3000);
  }

  async saveGroceryDataToDrive(): Promise<void> {
    try {
      if (!this.isGoogleSignedIn) {
        await this.signInToGoogle();
        if (!this.isGoogleSignedIn) return;
      }

      this.isLoadingDrive = true;
      this.driveOperationMessage = 'Opening folder picker...';

      // Get or create GroceryManager folder
      const folderId = await this.driveService.getOrCreateGroceryManagerFolder();
      
      if (!folderId) {
        this.driveOperationMessage = '❌ Folder selection cancelled';
        setTimeout(() => this.driveOperationMessage = '', 3000);
        return;
      }

      this.driveOperationMessage = 'Uploading grocery data...';
      const customerId = localStorage.getItem('customerId') || 'user';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `grocery-data-${customerId}-${timestamp}.json`;

      await this.driveService.uploadJsonFile(folderId, filename, this.groceryData);
      
      this.driveOperationMessage = `✅ Grocery data saved to Drive: ${filename}`;
      setTimeout(() => this.driveOperationMessage = '', 5000);
    } catch (error) {
      console.error('❌ Error saving to Drive:', error);
      this.driveOperationMessage = '❌ Failed to save to Drive. Please try again.';
      setTimeout(() => this.driveOperationMessage = '', 5000);
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
      this.driveOperationMessage = 'Opening folder picker...';

      // Get or create GroceryManager folder
      const folderId = await this.driveService.getOrCreateGroceryManagerFolder();
      
      if (!folderId) {
        this.driveOperationMessage = '❌ Folder selection cancelled';
        setTimeout(() => this.driveOperationMessage = '', 3000);
        return;
      }

      this.driveOperationMessage = 'Uploading summaries...';
      const customerId = localStorage.getItem('customerId') || 'user';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `grocery-summaries-${customerId}-${timestamp}.json`;

      await this.driveService.uploadJsonFile(folderId, filename, this.grocerySummaries);
      
      this.driveOperationMessage = `✅ Summaries saved to Drive: ${filename}`;
      setTimeout(() => this.driveOperationMessage = '', 5000);
    } catch (error) {
      console.error('❌ Error saving to Drive:', error);
      this.driveOperationMessage = '❌ Failed to save to Drive. Please try again.';
      setTimeout(() => this.driveOperationMessage = '', 5000);
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
      this.driveOperationMessage = 'Opening file picker...';

      const files = await this.driveService.openFilePicker('application/json');
      
      if (!files || files.length === 0) {
        this.driveOperationMessage = '❌ No file selected';
        setTimeout(() => this.driveOperationMessage = '', 3000);
        return;
      }

      this.driveOperationMessage = 'Downloading grocery data...';
      const fileData = await this.driveService.downloadJsonFile(files[0].id);
      
      // Validate and load data
      if (Array.isArray(fileData)) {
        this.groceryData = fileData;
        this.filteredData = [...this.groceryData];
        this.updatePagination();
        
        // Save to localStorage as well
        localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
        
        this.driveOperationMessage = `✅ Loaded ${fileData.length} items from Drive`;
        setTimeout(() => this.driveOperationMessage = '', 5000);
      } else {
        throw new Error('Invalid grocery data format');
      }
    } catch (error) {
      console.error('❌ Error loading from Drive:', error);
      this.driveOperationMessage = '❌ Failed to load from Drive. Please try again.';
      setTimeout(() => this.driveOperationMessage = '', 5000);
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
      this.driveOperationMessage = 'Opening file picker...';

      const files = await this.driveService.openFilePicker('application/json');
      
      if (!files || files.length === 0) {
        this.driveOperationMessage = '❌ No file selected';
        setTimeout(() => this.driveOperationMessage = '', 3000);
        return;
      }

      this.driveOperationMessage = 'Downloading summaries...';
      const fileData = await this.driveService.downloadJsonFile(files[0].id);
      
      // Validate and load data
      if (Array.isArray(fileData)) {
        this.grocerySummaries = fileData;
        
        // Save to localStorage as well
        localStorage.setItem('grocery-summaries', JSON.stringify(this.grocerySummaries));
        
        this.driveOperationMessage = `✅ Loaded ${fileData.length} summaries from Drive`;
        setTimeout(() => this.driveOperationMessage = '', 5000);
      } else {
        throw new Error('Invalid summaries data format');
      }
    } catch (error) {
      console.error('❌ Error loading from Drive:', error);
      this.driveOperationMessage = '❌ Failed to load from Drive. Please try again.';
      setTimeout(() => this.driveOperationMessage = '', 5000);
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
          this.filteredData = [...this.groceryData];
          this.updatePagination();
          
          // Save to localStorage
          localStorage.setItem('grocery-data', JSON.stringify(this.groceryData));
          
          alert(`✅ Successfully uploaded ${data.length} grocery items from ${file.name}`);
          console.log('✅ Grocery data uploaded:', data.length, 'items');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('❌ Error parsing grocery data file:', error);
        alert('❌ Failed to upload file. Please ensure it is a valid JSON file.');
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
          
          alert(`✅ Successfully uploaded ${data.length} summaries from ${file.name}`);
          console.log('✅ Summaries uploaded:', data.length, 'items');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('❌ Error parsing summaries file:', error);
        alert('❌ Failed to upload file. Please ensure it is a valid JSON file.');
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
    h2.textContent = 'Grocery Manager Help Guide';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.closeHelpModal());
    header.appendChild(h2);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.innerHTML = `
      <h3>Workflow Overview</h3>
      <ol>
        <li><strong>Add Items:</strong> Use Add Item to add lines with Category, Product Name, Brand, Size/Details, Quantity, Price (CAD). Mark items as Picked Up when bought.</li>
        <li><strong>Save Locally:</strong> Click Save to store your list in the browser (localStorage).</li>
        <li><strong>Create Summary:</strong> Click Summary Report, choose Date and Store, Actual Cost from receipt. Estimated Cost is auto-calculated from picked items. Click Add New Summary.</li>
        <li><strong>Export:</strong> Use Download Data and Download Summaries to save JSON backups.</li>
        <li><strong>Import on Desktop:</strong> Use Upload Data and Upload Summaries to load files on another device.</li>
        <li><strong>Statistics:</strong> Click Statistics to view Estimated vs Actual costs by date and store.</li>
      </ol>
      <h3>Tips</h3>
      <ul>
        <li>Save regularly and create a summary after every trip.</li>
        <li>Use search and filters to manage large lists.</li>
        <li>Back up with downloads; restore with uploads.</li>
      </ul>
    `;

    content.appendChild(header);
    content.appendChild(body);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.tempHelpOverlay = overlay;
  }
}

