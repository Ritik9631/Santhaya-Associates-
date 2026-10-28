/**
 * Supabase Database TypeScript Definitions
 * Schema: public
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = 'super_admin' | 'admin' | 'estimator' | 'billing_manager' | 'viewer';
export type CustomerType = 'government' | 'private_corporate' | 'contractor' | 'individual';
export type ServiceCategory = 'construction_tenders' | 'construction_machinery' | 'manufacturing_machinery';
export type QuotationRequestStatus = 'new' | 'under_review' | 'quotation_drafted' | 'rejected' | 'archived';
export type EmailStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'dead_letter';
export type QuotationStatus = 'draft' | 'issued' | 'revised' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'converted_to_invoice';
export type QuotationDeliveryChannel = 'download' | 'email' | 'phone' | 'whatsapp' | 'in_person';
export type InvoiceType = 'tax_invoice' | 'bill_of_supply' | 'non_gst';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'demand_draft' | 'other';

export interface Database {
  public: {
    Tables: {
      staff_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: StaffRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: StaffRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: StaffRole;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_name: string;
          primary_contact_person: string;
          email: string | null;
          phone: string | null;
          gstin: string | null;
          billing_address: string | null;
          billing_state?: string;
          client_type?: CustomerType;
          pan?: string | null;
          shipping_address?: string | null;
          state?: string | null;
          state_code?: string | null;
          customer_type?: CustomerType;
          is_active?: boolean;
          is_verified?: boolean;
          notes?: string | null;
          created_by?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          primary_contact_person: string;
          email?: string | null;
          phone?: string | null;
          gstin?: string | null;
          billing_address?: string | null;
          billing_state: string;
          client_type?: CustomerType;
          is_verified?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_name?: string;
          primary_contact_person?: string;
          email?: string | null;
          phone?: string | null;
          gstin?: string | null;
          billing_address?: string | null;
          billing_state?: string;
          client_type?: CustomerType;
          is_verified?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      products_services: {
        Row: {
          id: string;
          sku: string;
          name: string;
          category: string;
          item_type: string;
          description: string | null;
          unit_of_measurement: string;
          default_unit_price: number;
          hsn_sac_code: string | null;
          applicable_gst_rate: number;
          technical_specifications: Json;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          category: string;
          item_type?: string;
          description?: string | null;
          unit_of_measurement?: string;
          default_unit_price?: number;
          hsn_sac_code?: string | null;
          applicable_gst_rate?: number;
          technical_specifications?: Json;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          category?: string;
          item_type?: string;
          description?: string | null;
          unit_of_measurement?: string;
          default_unit_price?: number;
          hsn_sac_code?: string | null;
          applicable_gst_rate?: number;
          technical_specifications?: Json;
          is_active?: boolean;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotation_requests: {
        Row: {
          id: string;
          reference_number: string;
          customer_id: string | null;
          business_name: string;
          contact_person: string;
          email: string | null;
          phone: string | null;
          gstin: string | null;
          service_category: ServiceCategory;
          requirement_details: string;
          quantity: string | null;
          technicalSpecs: string | null;
          delivery_location: string;
          notes: string | null;
          privacy_consent: boolean;
          status: QuotationRequestStatus;
          assigned_staff_id: string | null;
          submission_ip_hash: string;
          user_agent: string | null;
          idempotency_key: string;
          request_payload_hash: string;
          risk_flag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_number: string;
          customer_id?: string | null;
          business_name: string;
          contact_person: string;
          email?: string | null;
          phone?: string | null;
          gstin?: string | null;
          service_category: ServiceCategory;
          requirement_details: string;
          quantity?: string | null;
          technicalSpecs?: string | null;
          delivery_location: string;
          notes?: string | null;
          privacy_consent: boolean;
          status?: QuotationRequestStatus;
          assigned_staff_id?: string | null;
          submission_ip_hash: string;
          user_agent?: string | null;
          idempotency_key: string;
          request_payload_hash: string;
          risk_flag?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reference_number?: string;
          customer_id?: string | null;
          business_name?: string;
          contact_person?: string;
          email?: string | null;
          phone?: string | null;
          gstin?: string | null;
          service_category?: ServiceCategory;
          requirement_details?: string;
          quantity?: string | null;
          technicalSpecs?: string | null;
          delivery_location?: string;
          notes?: string | null;
          privacy_consent?: boolean;
          status?: QuotationRequestStatus;
          assigned_staff_id?: string | null;
          submission_ip_hash?: string;
          user_agent?: string | null;
          idempotency_key?: string;
          request_payload_hash?: string;
          risk_flag?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          tokens: number;
          last_refilled_at: string;
          expires_at: string;
        };
        Insert: {
          key: string;
          tokens: number;
          last_refilled_at?: string;
          expires_at: string;
        };
        Update: {
          tokens?: number;
          last_refilled_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_type: string;
          actor_id: string | null;
          actor_ip_hash: string | null;
          previous_state: Json | null;
          new_state: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_type: string;
          actor_id?: string | null;
          actor_ip_hash?: string | null;
          previous_state?: Json | null;
          new_state?: Json | null;
          created_at?: string;
        };
        Update: Record<string, never>; // Immutable
        Relationships: [];
      };
      quotations: {
        Row: {
          id: string;
          quotation_number: string;
          customer_id: string;
          enquiry_id: string | null;
          status: QuotationStatus;
          place_of_supply_state_code: string;
          is_gst_applicable: boolean;
          current_version_number: number;
          created_by_staff_id: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_number: string;
          customer_id: string;
          enquiry_id?: string | null;
          status?: QuotationStatus;
          place_of_supply_state_code?: string;
          is_gst_applicable?: boolean;
          current_version_number?: number;
          created_by_staff_id: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quotation_number?: string;
          customer_id?: string;
          enquiry_id?: string | null;
          status?: QuotationStatus;
          place_of_supply_state_code?: string;
          is_gst_applicable?: boolean;
          current_version_number?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotation_versions: {
        Row: {
          id: string;
          quotation_id: string;
          version_number: number;
          version_code: string;
          validity_days: number;
          expires_at: string;
          delivery_location: string;
          payment_terms: string;
          terms_conditions: string | null;
          subtotal_amount: number;
          discount_amount: number;
          taxable_amount: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          total_tax_amount: number;
          round_off_amount: number;
          grand_total_amount: number;
          is_locked: boolean;
          issued_at: string | null;
          created_by_staff_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          version_number?: number;
          version_code: string;
          validity_days?: number;
          expires_at: string;
          delivery_location: string;
          payment_terms?: string;
          terms_conditions?: string | null;
          subtotal_amount?: number;
          discount_amount?: number;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          total_tax_amount?: number;
          round_off_amount?: number;
          grand_total_amount?: number;
          is_locked?: boolean;
          issued_at?: string | null;
          created_by_staff_id: string;
          created_at?: string;
        };
        Update: {
          version_number?: number;
          version_code?: string;
          validity_days?: number;
          expires_at?: string;
          delivery_location?: string;
          payment_terms?: string;
          terms_conditions?: string | null;
          subtotal_amount?: number;
          discount_amount?: number;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          total_tax_amount?: number;
          round_off_amount?: number;
          grand_total_amount?: number;
          is_locked?: boolean;
          issued_at?: string | null;
        };
        Relationships: [];
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_version_id: string;
          product_service_id: string | null;
          sort_order: number;
          item_name: string;
          description: string | null;
          hsn_sac_code: string | null;
          unit: string;
          quantity: number;
          unit_rate: number;
          discount_amount: number;
          taxable_amount: number;
          gst_rate: number;
          cgst_rate: number;
          sgst_rate: number;
          igst_rate: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          tax_amount: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_version_id: string;
          product_service_id?: string | null;
          sort_order?: number;
          item_name: string;
          description?: string | null;
          hsn_sac_code?: string | null;
          unit?: string;
          quantity?: number;
          unit_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          gst_rate?: number;
          cgst_rate?: number;
          sgst_rate?: number;
          igst_rate?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          line_total?: number;
          created_at?: string;
        };
        Update: {
          item_name?: string;
          description?: string | null;
          hsn_sac_code?: string | null;
          unit?: string;
          quantity?: number;
          unit_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          gst_rate?: number;
          cgst_rate?: number;
          sgst_rate?: number;
          igst_rate?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          line_total?: number;
        };
        Relationships: [];
      };
      quotation_acceptances: {
        Row: {
          id: string;
          quotation_id: string;
          quotation_version_id: string;
          accepted_at: string;
          accepted_by_contact_name: string;
          acceptance_channel: QuotationDeliveryChannel;
          client_po_reference: string | null;
          recorded_by_staff_id: string;
          staff_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          quotation_version_id: string;
          accepted_at?: string;
          accepted_by_contact_name: string;
          acceptance_channel?: QuotationDeliveryChannel;
          client_po_reference?: string | null;
          recorded_by_staff_id: string;
          staff_notes?: string | null;
          created_at?: string;
        };
        Update: {
          accepted_by_contact_name?: string;
          client_po_reference?: string | null;
          staff_notes?: string | null;
        };
        Relationships: [];
      };
      quotation_delivery_logs: {
        Row: {
          id: string;
          quotation_id: string;
          quotation_version_id: string;
          delivery_channel: QuotationDeliveryChannel;
          recipient_email: string | null;
          recipient_phone: string | null;
          delivery_status: string;
          notes: string | null;
          recorded_by_staff_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          quotation_version_id: string;
          delivery_channel: QuotationDeliveryChannel;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          delivery_status?: string;
          notes?: string | null;
          recorded_by_staff_id: string;
          created_at?: string;
        };
        Update: {
          delivery_status?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      invoice_sequence_counters: {
        Row: {
          financial_year: string;
          series: string;
          last_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          financial_year: string;
          series?: string;
          last_number?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          financial_year?: string;
          series?: string;
          last_number?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string | null;
          invoice_type: InvoiceType;
          customer_id: string;
          quotation_id: string | null;
          quotation_version_id: string | null;
          status: InvoiceStatus;
          invoice_date: string;
          due_date: string;
          financial_year: string;
          company_legal_name: string;
          company_trade_name: string;
          company_gstin: string;
          company_pan: string;
          company_state_code: string;
          company_state_name: string;
          company_registered_address: string;
          customer_billing_name: string;
          customer_gstin: string | null;
          customer_pan: string | null;
          customer_state_code: string;
          customer_state_name: string;
          customer_billing_address: string;
          delivery_location: string | null;
          client_po_reference: string | null;
          place_of_supply_state_code: string;
          is_intra_state: boolean;
          subtotal_amount: number;
          discount_amount: number;
          taxable_amount: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          total_tax_amount: number;
          round_off_amount: number;
          grand_total_amount: number;
          paid_amount: number;
          balance_amount: number;
          terms_conditions: string | null;
          payment_instructions: string | null;
          notes: string | null;
          cancelled_reason: string | null;
          issued_at: string | null;
          cancelled_at: string | null;
          created_by_staff_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number?: string | null;
          invoice_type?: InvoiceType;
          customer_id: string;
          quotation_id?: string | null;
          quotation_version_id?: string | null;
          status?: InvoiceStatus;
          invoice_date?: string;
          due_date?: string;
          financial_year: string;
          company_legal_name: string;
          company_trade_name: string;
          company_gstin: string;
          company_pan: string;
          company_state_code?: string;
          company_state_name?: string;
          company_registered_address: string;
          customer_billing_name: string;
          customer_gstin?: string | null;
          customer_pan?: string | null;
          customer_state_code?: string;
          customer_state_name?: string;
          customer_billing_address: string;
          delivery_location?: string | null;
          client_po_reference?: string | null;
          place_of_supply_state_code?: string;
          is_intra_state?: boolean;
          subtotal_amount?: number;
          discount_amount?: number;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          total_tax_amount?: number;
          round_off_amount?: number;
          grand_total_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          terms_conditions?: string | null;
          payment_instructions?: string | null;
          notes?: string | null;
          cancelled_reason?: string | null;
          issued_at?: string | null;
          cancelled_at?: string | null;
          created_by_staff_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          invoice_number?: string | null;
          invoice_type?: InvoiceType;
          customer_id?: string;
          quotation_id?: string | null;
          quotation_version_id?: string | null;
          status?: InvoiceStatus;
          invoice_date?: string;
          due_date?: string;
          financial_year?: string;
          customer_billing_name?: string;
          customer_gstin?: string | null;
          customer_pan?: string | null;
          customer_state_code?: string;
          customer_state_name?: string;
          customer_billing_address?: string;
          delivery_location?: string | null;
          client_po_reference?: string | null;
          place_of_supply_state_code?: string;
          is_intra_state?: boolean;
          subtotal_amount?: number;
          discount_amount?: number;
          taxable_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          total_tax_amount?: number;
          round_off_amount?: number;
          grand_total_amount?: number;
          paid_amount?: number;
          balance_amount?: number;
          terms_conditions?: string | null;
          payment_instructions?: string | null;
          notes?: string | null;
          cancelled_reason?: string | null;
          issued_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_service_id: string | null;
          sort_order: number;
          item_name: string;
          description: string | null;
          hsn_sac_code: string | null;
          unit: string;
          quantity: number;
          unit_rate: number;
          discount_amount: number;
          taxable_amount: number;
          gst_rate: number;
          cgst_rate: number;
          sgst_rate: number;
          igst_rate: number;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          tax_amount: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_service_id?: string | null;
          sort_order?: number;
          item_name: string;
          description?: string | null;
          hsn_sac_code?: string | null;
          unit?: string;
          quantity?: number;
          unit_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          gst_rate?: number;
          cgst_rate?: number;
          sgst_rate?: number;
          igst_rate?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          line_total?: number;
          created_at?: string;
        };
        Update: {
          item_name?: string;
          description?: string | null;
          hsn_sac_code?: string | null;
          unit?: string;
          quantity?: number;
          unit_rate?: number;
          discount_amount?: number;
          taxable_amount?: number;
          gst_rate?: number;
          cgst_rate?: number;
          sgst_rate?: number;
          igst_rate?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          tax_amount?: number;
          line_total?: number;
        };
        Relationships: [];
      };
      invoice_payments: {
        Row: {
          id: string;
          invoice_id: string;
          payment_receipt_number: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_date: string;
          transaction_reference: string | null;
          bank_name: string | null;
          notes: string | null;
          recorded_by_staff_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          payment_receipt_number?: string;
          amount: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          transaction_reference?: string | null;
          bank_name?: string | null;
          notes?: string | null;
          recorded_by_staff_id: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          payment_method?: PaymentMethod;
          payment_date?: string;
          transaction_reference?: string | null;
          bank_name?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          id: string;
          recipient_email: string;
          subject: string;
          email_type: string;
          payload: Json;
          status: string;
          attempts: number;
          max_attempts: number;
          next_retry_at: string;
          provider_message_id: string | null;
          error_message: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_email: string;
          subject: string;
          email_type: string;
          payload: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          next_retry_at?: string;
          provider_message_id?: string | null;
          error_message?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_email?: string;
          subject?: string;
          email_type?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          max_attempts?: number;
          next_retry_at?: string | null;
          provider_message_id?: string | null;
          error_message?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_quotation_request: {
        Args: {
          p_idempotency_key: string;
          p_request_payload_hash: string;
          p_business_name: string;
          p_contact_person: string;
          p_email: string;
          p_phone: string;
          p_gstin: string | null;
          p_service_category: ServiceCategory;
          p_requirement_details: string;
          p_quantity: string | null;
          p_technical_specs: string | null;
          p_delivery_location: string;
          p_notes: string | null;
          p_privacy_consent: boolean;
          p_submission_ip_hash: string;
          p_user_agent: string | null;
          p_risk_flag?: string;
        };
        Returns: {
          reference_number: string;
          created_at: string;
          result_status: string;
        }[];
      };
      submit_quotation_request_atomic: {
        Args: {
          p_idempotency_key: string;
          p_request_payload_hash: string;
          p_business_name: string;
          p_contact_person: string;
          p_email: string | null;
          p_phone: string | null;
          p_gstin: string | null;
          p_service_category: ServiceCategory;
          p_requirement_details: string;
          p_quantity: string | null;
          p_technical_specs: string | null;
          p_delivery_location: string;
          p_notes: string | null;
          p_privacy_consent: boolean;
          p_submission_ip_hash: string;
          p_user_agent: string | null;
          p_risk_flag?: string;
          p_admin_notification_email?: string;
        };
        Returns: {
          reference_number: string;
          created_at: string;
          result_status: string;
          outbox_id: string;
        }[];
      };
      claim_email_outbox_batch: {
        Args: {
          p_batch_size?: number;
        };
        Returns: Database['public']['Tables']['email_outbox']['Row'][];
      };
      check_rate_limit: {
        Args: {
          p_key: string;
          p_max_tokens: number;
          p_refill_seconds: number;
          p_cost?: number;
        };
        Returns: {
          allowed: boolean;
          retry_after: number;
        }[];
      };
      cleanup_expired_rate_limits: {
        Args: Record<string, never>;
        Returns: number;
      };
      is_super_admin: {
        Args: {
          p_user_id?: string;
        };
        Returns: boolean;
      };
      admin_update_staff_role: {
        Args: {
          p_target_user_id: string;
          p_new_role: StaffRole;
        };
        Returns: boolean;
      };
      admin_update_staff_status: {
        Args: {
          p_target_user_id: string;
          p_is_active: boolean;
        };
        Returns: boolean;
      };
      generate_quotation_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      allocate_invoice_number: {
        Args: {
          p_fy: string;
          p_series?: string;
        };
        Returns: string;
      };
      generate_payment_receipt_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      issue_invoice: {
        Args: {
          p_invoice_id: string;
        };
        Returns: string;
      };
      record_invoice_payment: {
        Args: {
          p_invoice_id: string;
          p_amount: number;
          p_method: PaymentMethod;
          p_payment_date?: string;
          p_txn_reference?: string | null;
          p_bank_name?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      admin_create_staff_profile: {
        Args: {
          p_user_id: string;
          p_email: string;
          p_full_name: string;
          p_role: StaffRole;
        };
        Returns: string;
      };
    };
    Enums: {
      staff_role_enum: StaffRole;
      customer_type_enum: CustomerType;
      service_category_enum: ServiceCategory;
      quotation_request_status_enum: QuotationRequestStatus;
      email_status_enum: EmailStatus;
      invoice_type_enum: InvoiceType;
      invoice_status_enum: InvoiceStatus;
      payment_method_enum: PaymentMethod;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
