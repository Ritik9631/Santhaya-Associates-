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

export type StaffRole = 'admin' | 'estimator' | 'billing_manager' | 'viewer';
export type CustomerType = 'government' | 'private_corporate' | 'contractor' | 'individual';
export type ServiceCategory = 'construction_tenders' | 'construction_machinery' | 'manufacturing_machinery';
export type QuotationRequestStatus = 'new' | 'under_review' | 'quotation_drafted' | 'rejected' | 'archived';

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
      };
      customers: {
        Row: {
          id: string;
          company_name: string;
          primary_contact_person: string;
          email: string;
          phone: string;
          gstin: string | null;
          billing_address: string | null;
          billing_state: string;
          client_type: CustomerType;
          is_verified: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          primary_contact_person: string;
          email: string;
          phone: string;
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
          email?: string;
          phone?: string;
          gstin?: string | null;
          billing_address?: string | null;
          billing_state?: string;
          client_type?: CustomerType;
          is_verified?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
      quotation_requests: {
        Row: {
          id: string;
          reference_number: string;
          customer_id: string | null;
          business_name: string;
          contact_person: string;
          email: string;
          phone: string;
          gstin: string | null;
          service_category: ServiceCategory;
          requirement_details: string;
          quantity: string | null;
          technical_specs: string | null;
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
          email: string;
          phone: string;
          gstin?: string | null;
          service_category: ServiceCategory;
          requirement_details: string;
          quantity?: string | null;
          technical_specs?: string | null;
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
          customer_id?: string | null;
          status?: QuotationRequestStatus;
          assigned_staff_id?: string | null;
          notes?: string | null;
          risk_flag?: string | null;
          updated_at?: string;
        };
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
        Update: never; // Immutable
      };
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
          result_status: 'created' | 'replayed';
        }[];
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
    };
  };
}
