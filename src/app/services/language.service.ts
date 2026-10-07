import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'en' | 'fr';

export const FRENCH_TEXT = {
  'Grocery Manager': 'Gestionnaire d’épicerie',
  'Hello {name}': 'Bonjour {name}',
  'Menu': 'Menu',
  'Add Item': 'Ajouter un article',
  'Language': 'Langue',
  'Summary Report': 'Rapport sommaire',
  'Statistics': 'Statistiques',
  'Help': 'Aide',
  'About Solution': 'À propos',
  'Save': 'Enregistrer',
  'Download Data': 'Télécharger les données',
  'Download Summaries': 'Télécharger les rapports',
  'Upload Data': 'Importer les données',
  'Upload Summaries': 'Importer les rapports',
  'Logout': 'Déconnexion',
  'Sort by Category': 'Trier par catégorie',
  'Sort by Product Name': 'Trier par nom de produit',
  'Previous': 'Précédent',
  'Next': 'Suivant',
  'Delete': 'Supprimer',
  'Add New Summary': 'Ajouter un rapport',
  'Close': 'Fermer',
  'Send Email': 'Envoyer le courriel',
  'Search grocery items...': 'Rechercher des articles d’épicerie...',
  'Show only unpicked items': 'Afficher uniquement les articles non ramassés',
  'Total: {count} items': 'Total : {count} articles',
  'Estimated Cost': 'Coût estimé',
  'Price Column Sum': 'Somme de la colonne Prix',
  'Picked Up': 'Ramassé',
  'Category': 'Catégorie',
  'Product Name': 'Nom du produit',
  'Brand': 'Marque',
  'Size / Details': 'Format / Détails',
  'Quantity': 'Quantité',
  'Price (CAD)': 'Prix (CAD)',
  'Actions': 'Actions',
  'No data found': 'Aucune donnée trouvée',
  'Showing {start} - {end} of {count} items': 'Affichage de {start} à {end} sur {count} articles',
  'Grocery Summary Report': 'Rapport sommaire d’épicerie',
  'No summary data available.': 'Aucun rapport disponible.',
  'Upload a summaries file or create one by clicking the button below.': 'Importez un fichier de rapports ou créez un rapport avec le bouton ci-dessous.',
  'Saved Summaries ({count} total)': 'Rapports enregistrés ({count} au total)',
  'Date': 'Date',
  'Store': 'Magasin',
  'Actual Cost': 'Coût réel',
  'Difference': 'Différence',
  'Reason': 'Raison',
  'Create New Summary': 'Créer un rapport',
  'Date of Grocery Shopping': 'Date des achats d’épicerie',
  'Enter actual cost': 'Saisir le coût réel',
  'Reason for Difference (optional)': 'Raison de la différence (facultatif)',
  'Explain why actual cost differs from estimate...': 'Expliquez pourquoi le coût réel diffère de l’estimation...',
  'Grocery Statistics': 'Statistiques d’épicerie',
  'No summary data available yet.': 'Aucun rapport disponible pour le moment.',
  'Create summaries by clicking the "Summary Report" button after shopping trips.': 'Créez des rapports avec le bouton « Rapport sommaire » après vos achats.',
  'Grocery Manager Help Guide': 'Guide d’aide de Grocery Manager',
  'Grocery Manager was developed by Daniel Seguin of SeguinDev in January 2026.': 'Grocery Manager a été développé par Daniel Seguin de SeguinDev en janvier 2026.',
  'Support': 'Soutien',
  'Your Name': 'Votre nom',
  'Name': 'Nom',
  'Phone': 'Téléphone',
  'Email': 'Courriel',
  'Message': 'Message',
  'Grocery Manager Support': 'Soutien de Grocery Manager',
  'Login': 'Connexion',
  'Customer ID': 'Identifiant client',
  'Application Token': 'Jeton d’application',
  'Welcome to the Grocery App! Redirecting...': 'Bienvenue dans l’application d’épicerie ! Redirection...',
  'Verifying...': 'Vérification...',
  'Failed to load authentication data.': 'Impossible de charger les données de connexion.',
  'Authentication data not loaded yet. Please try again.': 'Les données de connexion ne sont pas encore chargées. Veuillez réessayer.',
  'You have entered an incorrect Customer ID or Application Token. Please retry.': 'L’identifiant client ou le jeton d’application est incorrect. Veuillez réessayer.',
  'Unable to verify your token. Use HTTPS or localhost, or contact support to check the authentication data.': 'Impossible de vérifier votre jeton. Utilisez HTTPS ou localhost, ou contactez le soutien pour vérifier les données de connexion.',
  'Are you sure you want to delete this item?': 'Voulez-vous vraiment supprimer cet article ?',
  'JSON file not found in assets folder.\n\nPlease ensure grocery-data.json exists in src/assets/ folder': 'Fichier JSON introuvable dans le dossier assets.\n\nVérifiez que grocery-data.json existe dans src/assets/.',
  'Data saved successfully to browser storage!': 'Données enregistrées dans le navigateur !',
  'Failed to save data to browser storage.': 'Impossible d’enregistrer les données dans le navigateur.',
  'Failed to save summary to browser storage.': 'Impossible d’enregistrer le rapport dans le navigateur.',
  'Summary saved to browser storage!\n\nDate: {date}\nStore: {store}\nEstimated: {estimated}\nActual: {actual}\nDifference: {difference}\nReason: {reason}\n\nYour summary is now saved in browser storage and will appear in Statistics.': 'Rapport enregistré dans le navigateur !\n\nDate : {date}\nMagasin : {store}\nCoût estimé : {estimated}\nCoût réel : {actual}\nDifférence : {difference}\nRaison : {reason}\n\nVotre rapport est enregistré dans le navigateur et apparaîtra dans les statistiques.',
  'Failed to download grocery data.': 'Impossible de télécharger les données d’épicerie.',
  'Failed to download summaries.': 'Impossible de télécharger les rapports.',
  'Successfully uploaded {count} grocery items from {file}': '{count} articles importés depuis {file}',
  'Successfully uploaded {count} summaries from {file}': '{count} rapports importés depuis {file}',
  'Failed to upload file. Please ensure it is a valid JSON file.': 'Impossible d’importer le fichier. Vérifiez qu’il s’agit d’un fichier JSON valide.',
  'Signing in to Google...': 'Connexion à Google...',
  'Successfully signed in to Google Drive': 'Connexion à Google Drive réussie',
  'Sign-in failed. Google Drive is not set up. See QUICK_START.md for setup instructions.': 'Échec de la connexion. Google Drive n’est pas configuré. Consultez QUICK_START.md pour les instructions.',
  'Sign-in failed. Google API could not be loaded. Please refresh the page.': 'Échec de la connexion. Impossible de charger l’API Google. Actualisez la page.',
  'Sign-in failed. Please check your internet connection and try again.': 'Échec de la connexion. Vérifiez votre connexion Internet et réessayez.',
  'Signed out from Google Drive': 'Déconnexion de Google Drive effectuée',
  'Opening folder picker...': 'Ouverture du sélecteur de dossiers...',
  'Folder selection cancelled': 'Sélection du dossier annulée',
  'Uploading grocery data...': 'Envoi des données d’épicerie...',
  'Grocery data saved to Drive: {file}': 'Données d’épicerie enregistrées sur Drive : {file}',
  'Failed to save to Drive. Please try again.': 'Impossible d’enregistrer sur Drive. Veuillez réessayer.',
  'Uploading summaries...': 'Envoi des rapports...',
  'Summaries saved to Drive: {file}': 'Rapports enregistrés sur Drive : {file}',
  'Opening file picker...': 'Ouverture du sélecteur de fichiers...',
  'No file selected': 'Aucun fichier sélectionné',
  'Downloading grocery data...': 'Téléchargement des données d’épicerie...',
  'Loaded {count} items from Drive': '{count} articles chargés depuis Drive',
  'Failed to load from Drive. Please try again.': 'Impossible de charger les données depuis Drive. Veuillez réessayer.',
  'Downloading summaries...': 'Téléchargement des rapports...',
  'Loaded {count} summaries from Drive': '{count} rapports chargés depuis Drive',
  'Estimated': 'Estimé',
  'Actual': 'Réel',
  'Grocery Costs: Estimated vs Actual by Date and Store': 'Coûts d’épicerie : estimés et réels par date et magasin',
  'Cost (CAD)': 'Coût (CAD)'
} as const;

export type TextKey = keyof typeof FRENCH_TEXT;
export type TextParams = Readonly<Record<string, string | number>>;

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly selection = new BehaviorSubject<Language>(
    localStorage.getItem('grocery-language') === 'fr' ? 'fr' : 'en'
  );
  readonly changes = this.selection.asObservable();

  constructor() {
    this.updateDocument();
  }

  get currentLanguage(): Language {
    return this.selection.value;
  }

  get locale(): string {
    return this.currentLanguage === 'fr' ? 'fr-CA' : 'en-CA';
  }

  toggle(): void {
    const language = this.currentLanguage === 'en' ? 'fr' : 'en';
    try {
      localStorage.setItem('grocery-language', language);
    } catch (error) {
      console.error('Unable to persist language selection:', error);
      // The selection still applies to this session if browser storage is full.
    }
    this.selection.next(language);
    this.updateDocument();
  }

  text(key: TextKey, params: TextParams = {}): string {
    const text = this.currentLanguage === 'fr' ? FRENCH_TEXT[key] : key;
    return text.replace(/\{(\w+)\}/g, (_, name: string) => {
      if (!(name in params)) throw new Error(`Missing translation parameter: ${name}`);
      return String(params[name]);
    });
  }

  currency(value: number): string {
    return new Intl.NumberFormat(this.locale, { style: 'currency', currency: 'CAD' }).format(value);
  }

  date(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return new Intl.DateTimeFormat(this.locale).format(date);
  }

  private updateDocument(): void {
    document.documentElement.lang = this.currentLanguage;
    document.title = this.text('Grocery Manager');
  }
}
