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

const SEARCH_CATALOG = `
  query SearchCatalog($input: SearchInput!) {
    searchCatalog(input: $input) {
      items {
        productId
        productName
        slug
        description
        productAsset {
          preview
        }
      }
    }
  }
`;

const GET_PRODUCTS = `
  query GetProducts($take: Int!) {
    products(options: { take: $take }) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          preview
        }
        variants {
          id
          price
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

export interface CatalogProductPreview {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  price: number;
}

export interface AddItemOrderResult {
  id: string;
  code: string;
  state: string;
  totalQuantity?: number;
  errorCode?: string;
  message?: string;
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

export async function searchProducts(
  term: string,
  take: number,
): Promise<CatalogProductPreview[]> {
  const result = await runQuery<{
    searchCatalog: {
      items: Array<{
        productId: string;
        productName: string;
        slug: string;
        description: string;
        productAsset?: { preview: string } | null;
      }>;
    };
  }>(SEARCH_CATALOG, { input: { term, take } });

  return result.data.searchCatalog.items.map((item) => ({
    id: item.productId,
    name: item.productName,
    slug: item.slug,
    description: item.description,
    thumbnail: item.productAsset?.preview ?? null,
    price: 0,
  }));
}

export async function fetchProducts(take: number): Promise<CatalogProductPreview[]> {
  const result = await runQuery<{
    products: {
      items: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        featuredAsset?: { preview: string } | null;
        variants?: Array<{ id: string; price: number }> | null;
      }>;
    };
  }>(GET_PRODUCTS, { take });

  return result.data.products.items.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    thumbnail: item.featuredAsset?.preview ?? null,
    price: item.variants?.[0]?.price ? item.variants[0].price / 100 : 0,
  }));
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
  token: string | null,
): Promise<{ order?: AddItemOrderResult; token?: string | null; error?: string }> {
  const result = await runQuery<{ addItemToOrder: AddItemOrderResult }>(
    ADD_ITEM_TO_ORDER,
    { productVariantId: variantId, quantity },
    token,
  );

  const res = result.data.addItemToOrder;
  if (res.errorCode) {
    return { error: res.message, token: result.token };
  }
  return { order: res, token: result.token };
}
