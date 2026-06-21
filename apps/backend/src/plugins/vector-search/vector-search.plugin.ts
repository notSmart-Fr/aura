import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { VectorSearchResolver } from './vector-search.resolver';
import { VectorSearchService } from './vector-search.service';

const shopApiExtensions = gql`
  extend type Query {
    searchCatalog(input: SearchInput!): SearchCatalogResponse!
  }

  type SearchCatalogResponse {
    items: [SearchCatalogItem!]!
  }

  type SearchCatalogItem {
    productId: ID!
    productName: String!
    slug: String!
    description: String!
    productAsset: SearchCatalogAsset
  }

  type SearchCatalogAsset {
    preview: String
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [VectorSearchService],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [VectorSearchResolver],
  },
})
export class VectorSearchPlugin {}
