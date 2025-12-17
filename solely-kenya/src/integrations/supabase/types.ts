export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      },
      mpesa_transactions: {
        Row: {
          amount: number
          checkout_request_id: string
          created_at: string
          id: string
          merchant_request_id: string
          mpesa_receipt_number: string | null
          phone_number: string
          plan: string
          result_code: number | null
          result_desc: string | null
          status: string
          transaction_date: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          checkout_request_id: string
          created_at?: string
          id?: string
          merchant_request_id: string
          mpesa_receipt_number?: string | null
          phone_number: string
          plan: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          transaction_date?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string
          created_at?: string
          id?: string
          merchant_request_id?: string
          mpesa_receipt_number?: string | null
          phone_number?: string
          plan?: string
          result_code?: number | null
          result_desc?: string | null
          status?: string
          transaction_date?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          product_id: string
          target_price: number | null
          original_price: number
          created_at: string | null
          notified_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          target_price?: number | null
          original_price: number
          created_at?: string | null
          notified_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          target_price?: number | null
          original_price?: number
          created_at?: string | null
          notified_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          auto_release_at: string | null
          buyer_confirmed: boolean
          cancelled_at: string | null
          commission_amount: number
          commission_rate: number
          completed_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          dispute_id: string | null
          id: string
          payout_amount: number
          shipped_at: string | null
          shipping_fee_ksh: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_ksh: number
          total_ksh: number
          updated_at: string
          vendor_confirmed: boolean
          vendor_id: string
        }
        Insert: {
          accepted_at?: string | null
          auto_release_at?: string | null
          buyer_confirmed?: boolean
          cancelled_at?: string | null
          commission_amount: number
          commission_rate?: number
          completed_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          dispute_id?: string | null
          id?: string
          payout_amount: number
          shipped_at?: string | null
          shipping_fee_ksh?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_ksh: number
          total_ksh: number
          updated_at?: string
          vendor_confirmed?: boolean
          vendor_id: string
        }
        Update: {
          accepted_at?: string | null
          auto_release_at?: string | null
          buyer_confirmed?: boolean
          cancelled_at?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          dispute_id?: string | null
          id?: string
          payout_amount?: number
          shipped_at?: string | null
          shipping_fee_ksh?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_ksh?: number
          total_ksh?: number
          updated_at?: string
          vendor_confirmed?: boolean
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: true
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      order_items: {
        Row: {
          id: string
          line_total_ksh: number
          order_id: string
          product_id: string
          product_name: string
          product_snapshot: Json
          quantity: number
          unit_price_ksh: number
        }
        Insert: {
          id?: string
          line_total_ksh: number
          order_id: string
          product_id: string
          product_name: string
          product_snapshot: Json
          quantity: number
          unit_price_ksh: number
        }
        Update: {
          id?: string
          line_total_ksh?: number
          order_id?: string
          product_id?: string
          product_name?: string
          product_snapshot?: Json
          quantity?: number
          unit_price_ksh?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      },
      order_shipping_details: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          courier_name: string | null
          created_at: string
          delivery_notes: string | null
          email: string | null
          order_id: string
          phone: string
          postal_code: string | null
          recipient_name: string
          shipment_proof_url: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          courier_name?: string | null
          created_at?: string
          delivery_notes?: string | null
          email?: string | null
          order_id: string
          phone: string
          postal_code?: string | null
          recipient_name: string
          shipment_proof_url?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          courier_name?: string | null
          created_at?: string
          delivery_notes?: string | null
          email?: string | null
          order_id?: string
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          shipment_proof_url?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      },
      payments: {
        Row: {
          amount_ksh: number
          captured_at: string | null
          created_at: string
          currency: string
          gateway: Database["public"]["Enums"]["payment_gateway"]
          id: string
          metadata: Json | null
          order_id: string
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_reference: string | null
        }
        Insert: {
          amount_ksh: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          gateway: Database["public"]["Enums"]["payment_gateway"]
          id?: string
          metadata?: Json | null
          order_id: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
        }
        Update: {
          amount_ksh?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          gateway?: Database["public"]["Enums"]["payment_gateway"]
          id?: string
          metadata?: Json | null
          order_id?: string
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      },
      escrow_transactions: {
        Row: {
          commission_amount: number
          created_at: string
          held_amount: number
          id: string
          notes: string | null
          order_id: string
          payment_id: string
          release_amount: number
          released_at: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["escrow_status"]
        }
        Insert: {
          commission_amount: number
          created_at?: string
          held_amount: number
          id?: string
          notes?: string | null
          order_id: string
          payment_id: string
          release_amount: number
          released_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Update: {
          commission_amount?: number
          created_at?: string
          held_amount?: number
          id?: string
          notes?: string | null
          order_id?: string
          payment_id?: string
          release_amount?: number
          released_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      },
      payouts: {
        Row: {
          amount_ksh: number
          commission_amount: number
          failed_at: string | null
          failure_reason: string | null
          id: string
          method: Database["public"]["Enums"]["payout_method"]
          order_id: string
          paid_at: string | null
          processing_at: string | null
          reference: string | null
          requested_at: string
          status: Database["public"]["Enums"]["payout_status"]
          vendor_id: string
        }
        Insert: {
          amount_ksh: number
          commission_amount: number
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          method: Database["public"]["Enums"]["payout_method"]
          order_id: string
          paid_at?: string | null
          processing_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          vendor_id: string
        }
        Update: {
          amount_ksh?: number
          commission_amount?: number
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payout_method"]
          order_id?: string
          paid_at?: string | null
          processing_at?: string | null
          reference?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["payout_status"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      disputes: {
        Row: {
          customer_id: string
          description: string | null
          evidence_urls: string[] | null
          id: string
          opened_at: string
          order_id: string
          reason: Database["public"]["Enums"]["dispute_reason"]
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          vendor_id: string
        }
        Insert: {
          customer_id: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          opened_at?: string
          order_id: string
          reason: Database["public"]["Enums"]["dispute_reason"]
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          vendor_id: string
        }
        Update: {
          customer_id?: string
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          opened_at?: string
          order_id?: string
          reason?: Database["public"]["Enums"]["dispute_reason"]
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      commission_ledger: {
        Row: {
          commission_amount: number
          commission_rate: number
          id: string
          notes: string | null
          order_id: string
          recorded_at: string
          vendor_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          id?: string
          notes?: string | null
          order_id: string
          recorded_at?: string
          vendor_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          id?: string
          notes?: string | null
          order_id?: string
          recorded_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      product_views: {
        Row: {
          id: string
          product_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_views_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          key_features: string[] | null
          name: string
          price_ksh: number
          sizes: string[] | null
          status: Database["public"]["Enums"]["product_status"] | null
          stock: number | null
          updated_at: string | null
          vendor_id: string
          views: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          key_features?: string[] | null
          name: string
          price_ksh: number
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stock?: number | null
          updated_at?: string | null
          vendor_id: string
          views?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          key_features?: string[] | null
          name?: string
          price_ksh?: number
          sizes?: string[] | null
          status?: Database["public"]["Enums"]["product_status"] | null
          stock?: number | null
          updated_at?: string | null
          vendor_id?: string
          views?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          store_description: string | null
          store_logo_url: string | null
          store_name: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          product_id: string
          rating: number
          reviewer_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          reviewer_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          payment_reference: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_ksh: number
          product_limit: number | null
          start_date: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          payment_reference?: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_ksh: number
          product_limit?: number | null
          start_date?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          payment_reference?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_ksh?: number
          product_limit?: number | null
          start_date?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_ratings: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          order_id: string
          rating: number
          review: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          order_id: string
          rating: number
          review?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          rating?: number
          review?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_role: { Args: { _user_email: string }; Returns: undefined }
      check_subscription_expiry: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_product: {
        Args: { product_id_to_publish: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "user"
      dispute_reason: "no_delivery" | "wrong_item" | "damaged" | "other"
      dispute_status:
      | "open"
      | "under_review"
      | "resolved_refund"
      | "resolved_release"
      | "closed"
      escrow_status: "held" | "released" | "refunded" | "withheld"
      order_status: "pending" | "pending_vendor_confirmation" | "accepted" | "shipped" | "arrived" | "delivered" | "completed" | "cancelled" | "disputed" | "refunded" | "cancelled_by_vendor" | "cancelled_by_customer"
      payout_method: "mpesa" | "bank"
      payout_status: "pending" | "processing" | "paid" | "failed"
      payment_gateway: "mpesa" | "card" | "paypal" | "flutterwave"
      payment_status: "pending" | "authorized" | "captured" | "refunded" | "chargeback"
      product_status: "active" | "out_of_stock" | "draft"
      subscription_plan: "starter" | "growth" | "pro" | "unlimited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendor", "user"],
      order_status: ["pending", "confirmed", "completed", "cancelled"],
      product_status: ["active", "out_of_stock", "draft"],
      subscription_plan: ["starter", "growth", "pro", "unlimited"],
    },
  },
} as const
