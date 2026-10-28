'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActionResponse<T = Record<string, unknown>> {
  success?: boolean;
  error?: string;
  data?: T;
}

const AUTHORIZED_ROLES = ['super_admin', 'admin', 'estimator', 'billing_manager'];

/**
 * Server Action: Create a new catalog item (machinery, service, rental)
 */
export async function createCatalogItemAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ itemId: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to create catalog items.' };
    }

    const sku = (formData.get('sku') as string)?.trim().toUpperCase();
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as string)?.trim();
    const itemType = (formData.get('itemType') as string)?.trim() || 'product';
    const description = (formData.get('description') as string)?.trim() || null;
    const unitOfMeasurement = (formData.get('unitOfMeasurement') as string)?.trim() || 'unit';
    const defaultUnitPriceStr = (formData.get('defaultUnitPrice') as string)?.trim();
    const hsnSacCode = (formData.get('hsnSacCode') as string)?.trim().toUpperCase() || null;
    const applicableGstRateStr = (formData.get('applicableGstRate') as string)?.trim();
    const specificationsRaw = (formData.get('specifications') as string)?.trim();

    // Validation
    if (!sku || sku.length < 2) {
      return { error: 'SKU / Internal Reference Code is required (min 2 characters).' };
    }
    if (!name || name.length < 2) {
      return { error: 'Item / Service Name is required (min 2 characters).' };
    }
    if (!category) {
      return { error: 'Category classification is required.' };
    }

    const defaultUnitPrice = parseFloat(defaultUnitPriceStr || '0');
    if (isNaN(defaultUnitPrice) || defaultUnitPrice < 0) {
      return { error: 'Default unit price must be a valid positive number.' };
    }

    const applicableGstRate = parseFloat(applicableGstRateStr || '18.00');
    if (isNaN(applicableGstRate) || applicableGstRate < 0 || applicableGstRate > 100) {
      return { error: 'Applicable GST rate must be between 0% and 100%.' };
    }

    let technicalSpecs = {};
    if (specificationsRaw) {
      try {
        technicalSpecs = JSON.parse(specificationsRaw);
      } catch {
        technicalSpecs = { notes: specificationsRaw };
      }
    }

    const admin = createAdminClient();

    // Check SKU Uniqueness
    const { data: existingSku } = await admin
      .from('products_services')
      .select('id, name')
      .eq('sku', sku)
      .limit(1);

    if (existingSku && existingSku.length > 0) {
      return { error: `Duplicate SKU: An item with SKU "${sku}" already exists ("${existingSku[0].name}").` };
    }

    const insertPayload = {
      sku,
      name,
      category,
      item_type: itemType,
      description,
      unit_of_measurement: unitOfMeasurement,
      default_unit_price: defaultUnitPrice,
      hsn_sac_code: hsnSacCode,
      applicable_gst_rate: applicableGstRate,
      technical_specifications: technicalSpecs,
      is_active: true,
      created_by: profile.id,
    };

    const supabase = await createServerSupabaseClient();
    let itemId: string | null = null;

    const { data: inserted, error: insertError } = await supabase
      .from('products_services')
      .insert(insertPayload as any)
      .select('id')
      .single();

    if (insertError) {
      // Fallback to admin client if RLS is not yet applied
      const { data: adminInserted, error: adminError } = await admin
        .from('products_services')
        .insert(insertPayload as any)
        .select('id')
        .single();

      if (adminError || !adminInserted) {
        return { error: `Failed to create catalog item: ${adminError?.message || insertError.message}` };
      }
      itemId = adminInserted.id;
    } else {
      itemId = inserted.id;
    }

    // Insert Audit Trail
    await admin.from('audit_logs').insert({
      entity_type: 'products_services',
      entity_id: itemId,
      action: 'catalog_item_created',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: { sku, name, category, default_unit_price: defaultUnitPrice, applicable_gst_rate: applicableGstRate },
    });

    revalidatePath('/staff/catalog');

    return {
      success: true,
      data: { itemId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}

/**
 * Server Action: Update catalog item
 */
export async function updateCatalogItemAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to edit catalog items.' };
    }

    const itemId = (formData.get('itemId') as string)?.trim();
    if (!itemId) return { error: 'Catalog Item ID is required.' };

    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as string)?.trim();
    const itemType = (formData.get('itemType') as string)?.trim() || 'product';
    const description = (formData.get('description') as string)?.trim() || null;
    const unitOfMeasurement = (formData.get('unitOfMeasurement') as string)?.trim() || 'unit';
    const defaultUnitPriceStr = (formData.get('defaultUnitPrice') as string)?.trim();
    const hsnSacCode = (formData.get('hsnSacCode') as string)?.trim().toUpperCase() || null;
    const applicableGstRateStr = (formData.get('applicableGstRate') as string)?.trim();

    if (!name || name.length < 2) {
      return { error: 'Item name is required.' };
    }

    const defaultUnitPrice = parseFloat(defaultUnitPriceStr || '0');
    const applicableGstRate = parseFloat(applicableGstRateStr || '18.00');

    const admin = createAdminClient();
    const { data: prevItem } = await admin
      .from('products_services')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!prevItem) return { error: 'Catalog item not found.' };

    const updatePayload = {
      name,
      category,
      item_type: itemType,
      description,
      unit_of_measurement: unitOfMeasurement,
      default_unit_price: defaultUnitPrice,
      hsn_sac_code: hsnSacCode,
      applicable_gst_rate: applicableGstRate,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from('products_services')
      .update(updatePayload as any)
      .eq('id', itemId);

    if (updateError) {
      return { error: `Failed to update catalog item: ${updateError.message}` };
    }

    await admin.from('audit_logs').insert({
      entity_type: 'products_services',
      entity_id: itemId,
      action: 'catalog_item_updated',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { name: prevItem.name, default_unit_price: prevItem.default_unit_price },
      new_state: updatePayload,
    });

    revalidatePath('/staff/catalog');
    revalidatePath(`/staff/catalog/${itemId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update catalog item.';
    return { error: message };
  }
}

/**
 * Server Action: Activate / Deactivate catalog item
 */
export async function toggleCatalogItemStatusAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to alter catalog status.' };
    }

    const itemId = (formData.get('itemId') as string)?.trim();
    const isActiveStr = formData.get('isActive') as string;
    const isActive = isActiveStr === 'true';

    if (!itemId) return { error: 'Catalog item ID is required.' };

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from('products_services')
      .update({ is_active: isActive, updated_at: new Date().toISOString() } as any)
      .eq('id', itemId);

    if (updateError) {
      return { error: updateError.message };
    }

    await admin.from('audit_logs').insert({
      entity_type: 'products_services',
      entity_id: itemId,
      action: isActive ? 'catalog_item_activated' : 'catalog_item_deactivated',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: { is_active: isActive },
    });

    revalidatePath('/staff/catalog');
    revalidatePath(`/staff/catalog/${itemId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to alter catalog status.';
    return { error: message };
  }
}

