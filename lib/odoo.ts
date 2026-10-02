import xmlrpc from 'xmlrpc';

export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

export class OdooService {
  private url: string;
  private db: string;
  private username: string;
  private password: string;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    this.url = config.url;
    this.db = config.db;
    this.username = config.username;
    this.password = config.password;
  }

  private getClient(path: string) {
    const fullUrl = `${this.url}${path}`;
    if (fullUrl.startsWith('https://')) {
      return xmlrpc.createSecureClient(fullUrl);
    }
    return xmlrpc.createClient(fullUrl);
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    
    return new Promise((resolve, reject) => {
      const client = this.getClient('/xmlrpc/2/common');
      client.methodCall('authenticate', [this.db, this.username, this.password, {}], (error, value) => {
        if (error) return reject(error);
        if (!value) return reject(new Error('Authentication failed'));
        this.uid = value as number;
        resolve(this.uid);
      });
    });
  }

  async executeKw(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    const uid = await this.authenticate();
    return new Promise((resolve, reject) => {
      const client = this.getClient('/xmlrpc/2/object');
      client.methodCall('execute_kw', [this.db, uid, this.password, model, method, args, kwargs], (error, value) => {
        if (error) return reject(error);
        resolve(value);
      });
    });
  }

  async searchRead(model: string, domain: any[] = [], fields: string[] = [], offset = 0, limit = 0, order: string = ''): Promise<any[]> {
    const kwargs: any = {};
    if (fields.length > 0) kwargs.fields = fields;
    if (offset > 0) kwargs.offset = offset;
    if (limit > 0) kwargs.limit = limit;
    if (order) kwargs.order = order;

    return this.executeKw(model, 'search_read', [domain], kwargs);
  }

  // --- Odoo Specific Helpers ---

  async getFacturas(fechaInicio: string, fechaFin: string, isPurchase = false) {
    // account.move: is facturas and compras (move_type = out_invoice for sales, in_invoice for purchases)
    const moveType = isPurchase ? ['in_invoice', 'in_receipt'] : ['out_invoice', 'out_receipt'];
    const domain = [
      ['move_type', 'in', moveType],
      ['date', '>=', fechaInicio],
      ['date', '<=', fechaFin],
      ['state', '=', 'posted']
    ];
    return this.searchRead('account.move', domain, ['name', 'date', 'partner_id', 'amount_total', 'amount_untaxed', 'amount_tax', 'state', 'currency_id']);
  }

  async getCuentasPorCobrar() {
    // account.move.line for receivables
    const domain = [
      ['account_id.account_type', '=', 'asset_receivable'],
      ['parent_state', '=', 'posted'],
      ['amount_residual', '!=', 0]
    ];
    return this.searchRead('account.move.line', domain, ['partner_id', 'name', 'date_maturity', 'amount_residual', 'currency_id']);
  }

  async getCajasYBancos() {
    // res.partner.bank or account.journal depending on where they keep the balances.
    // In Odoo, balances are usually on account.account or account.journal. 
    // Usually, bank and cash journals are tracked in account.journal and their balances calculated through move lines.
    return this.searchRead('account.journal', [['type', 'in', ['bank', 'cash']]], ['name', 'type', 'currency_id']);
  }
}
