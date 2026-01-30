import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  
  // Summary Report Modal
  showSummaryModal: boolean = false;
  summaryDate: string = '';
  summaryActualCost: number = 0;
  summaryStore: string = 'Super C';
  grocerySummaries: GrocerySummary[] = [];
  
  // Store options
  stores: string[] = [
    'Super C',
    'Metro',
    'IGA',
    'Maxi',
    'Provigo',
    'Loblaws'
  ];
  
  // Summary Report Modal
  showSummaryModal: boolean = false;
  summaryDate: string = '';
  summaryActualCost: number = 0;
  summaryStore: string = 'Super C';
  grocerySummaries: GrocerySummary[] = [];
  
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadJsonData();
    this.loadSummaries();
  }

  loadJsonData(): void {
    // Load from local JSON file
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

  loadSummaries(): void {
    this.http.get<GrocerySummary[]>(this.summariesJsonPath)
      .subscribe({
        next: (summaries) => {
          this.grocerySummaries = summaries;
          console.log('✅ Successfully loaded summaries');
        },
        error: (error) => {
          console.log('ℹ️ No existing summaries found (this is normal for first time)');
          this.grocerySummaries = [];
        }
      });
  }
          this.processJsonData(jsonData);
        },
        error: (error) => {
          console.error('❌ Error loading JSON file:', error);
          alert('JSON file not found in assets folder.\n\nPlease ensure grocery-data.json exists in src/assets/ folder');
        }
      });
  }

  loadSummaries(): void {
    this.http.get<GrocerySummary[]>(this.summariesJsonPath)
      .subscribe({
        next: (summaries) => {
          this.grocerySummaries = summaries;
          console.log('✅ Successfully loaded summaries');
        },
        error: (error) => {
          console.log('ℹ️ No existing summaries found (this is normal for first time)');
          this.grocerySummaries = [];
        }
      });
  }

  processJsonData(jsonData: any[]): void {
    // Load data directly without adding selection
    this.groceryData = jsonData;
    
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
    const newItem: GroceryItem = {
      Category: 'Fruits et légumes',
      'Product Name': '',
      Brand: '',
      'Size / Details': '',
      Quantity: 1,
      'Price (CAD)': 0,
      'Picked Up': false
    };
    
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

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }

  getEstimatedCost(): number {
    return this.groceryData.reduce((total, item) => {
      return total + (item['Price (CAD)'] * item.Quantity);
    }, 0);
  }

  saveSummary(): void {
    const summary: GrocerySummary = {
      date: this.summaryDate,
      estimatedCost: this.getEstimatedCost(),
      actualCost: this.summaryActualCost,
      store: this.summaryStore
    };

    this.grocerySummaries.push(summary);
    
    // Save to backend
    this.http.post('http://localhost:3000/api/save-summary', this.grocerySummaries)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Summary saved successfully');
          alert(`Summary saved!\n\nDate: ${summary.date}\nStore: ${summary.store}\nEstimated: $${summary.estimatedCost.toFixed(2)}\nActual: $${summary.actualCost.toFixed(2)}\nDifference: $${(summary.actualCost - summary.estimatedCost).toFixed(2)}`);
          this.closeSummaryModal();
        },
        error: (error) => {
          console.error('❌ Error saving summary:', error);
          alert('Failed to save summary. Make sure the save server is running.\n\nRun: npm run server (in a separate terminal)');
        }
      });
  }

  openSummaryReport(): void {
    this.showSummaryModal = true;
    // Set default date to today
    const today = new Date();
    this.summaryDate = today.toISOString().split('T')[0];
    this.summaryActualCost = 0;
    this.summaryStore = 'Super C';
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }

  getEstimatedCost(): number {
    return this.groceryData.reduce((total, item) => {
      return total + (item['Price (CAD)'] * item.Quantity);
    }, 0);
  }

  saveSummary(): void {
    const summary: GrocerySummary = {
      date: this.summaryDate,
      estimatedCost: this.getEstimatedCost(),
      actualCost: this.summaryActualCost,
      store: this.summaryStore
    };

    this.grocerySummaries.push(summary);
    
    // Save to backend (optional - for now just logging)
    console.log('Grocery Summary Saved:', summary);
    alert(`Summary saved!\n\nDate: ${summary.date}\nStore: ${summary.store}\nEstimated: $${summary.estimatedCost.toFixed(2)}\nActual: $${summary.actualCost.toFixed(2)}\nDifference: $${(summary.actualCost - summary.estimatedCost).toFixed(2)}`);
    
    this.closeSummaryModal();
  }

  saveToExcel(): void {
    // Save all data to the JSON file via backend
    const dataToSave = this.groceryData;

    this.http.post('http://localhost:3000/api/save', dataToSave)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Data saved successfully');
          alert('Data saved successfully to grocery-data.json!');
        },
        error: (error) => {
          console.error('❌ Error saving data:', error);
          alert('Failed to save data. Make sure the save server is running.\n\nRun: npm run server (in a separate terminal)');
        }
      });
  }

  exitApp(): void {
    if (confirm('Are you sure you want to exit?')) {
      window.close();
      // If window.close() doesn't work (browser restriction), redirect
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 100);
    }
  }
}
