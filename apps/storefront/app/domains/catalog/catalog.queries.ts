import { runQuery } from "../common/graphql-client";

// Get Product by Slug
const GET_PRODUCT_BY_SLUG = `
  query GetProduct($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        preview
      }
      assets {
        preview
      }
      optionGroups {
        id
        name
        code
        options {
          id
          code
          name
        }
      }
      variants {
        id
        name
        sku
        price
        options {
          id
          code
          name
          group {
            id
            name
            code
          }
        }
        featuredAsset {
          preview
        }
      }
    }
  }
`;

// Get Active Order
const GET_ACTIVE_ORDER = `
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      subTotal
      total
      totalQuantity
      shipping
      lines {
        id
        quantity
        linePrice
        productVariant {
          id
          name
          sku
          price
          featuredAsset {
            preview
          }
        }
      }
    }
  }
`;

// Add Item to Order Mutation
const ADD_ITEM_TO_ORDER = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        totalQuantity
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  options: Array<{
    id: string;
    code: string;
    name: string;
    group: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  featuredAsset?: {
    preview: string;
  };
}

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: {
    preview: string;
  };
  assets: Array<{
    preview: string;
  }>;
  optionGroups: Array<{
    id: string;
    name: string;
    code: string;
    options: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  }>;
  variants: ProductVariant[];
}

export interface ActiveOrder {
  id: string;
  code: string;
  state: string;
  subTotal: number;
  total: number;
  totalQuantity: number;
  shipping: number;
  lines: Array<{
    id: string;
    quantity: number;
    linePrice: number;
    productVariant: {
      id: string;
      name: string;
      sku: string;
      price: number;
      featuredAsset?: {
        preview: string;
      };
    };
  }>;
}

export async function fetchProductBySlug(slug: string): Promise<ProductData | null> {
  const result = await runQuery<{ product: ProductData | null }>(GET_PRODUCT_BY_SLUG, { slug });
  return result.data.product;
}

export async function fetchActiveOrder(token: string | null): Promise<ActiveOrder | null> {
  try {
    const result = await runQuery<{ activeOrder: ActiveOrder | null }>(GET_ACTIVE_ORDER, {}, token);
    return result.data.activeOrder;
  } catch {
    return null;
  }
}

export async function addItemToOrder(
  variantId: string,
  quantity: number,
  token: string | null
): Promise<{ order?: any; token?: string | null; error?: string }> {
  const result = await runQuery<any>(
    ADD_ITEM_TO_ORDER,
    { productVariantId: variantId, quantity },
    token
  );

  const res = result.data.addItemToOrder;
  if (res.errorCode) {
    return { error: res.message, token: result.token };
  }
  return { order: res, token: result.token };
}
