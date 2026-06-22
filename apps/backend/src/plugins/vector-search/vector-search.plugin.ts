import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { VectorSearchResolver } from './vector-search.resolver';
import { VectorSearchService } from './vector-search.service';
import { Queue } from 'bullmq';

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
  configuration: (config) => {
    const ingestionQueue = new Queue('whatsapp-ingestion', {
      connection: {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      },
    });

    config.apiOptions.middleware.push({
      route: 'api/webhooks/whatsapp',
      handler: async (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          const mode = req.query['hub.mode'];
          const token = req.query['hub.verify_token'];
          const challenge = req.query['hub.challenge'];
          const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'default_verify_token';

          if (mode === 'subscribe' && token === verifyToken) {
            res.status(200).send(challenge);
          } else {
            res.status(403).send('Forbidden');
          }
        } else if (req.method === 'POST') {
          try {
            const body = req.body;
            const sender = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
            const text = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

            if (sender && text) {
              await ingestionQueue.add('message', {
                sender,
                text,
              });
            }
            res.status(200).send('EVENT_RECEIVED');
          } catch (error) {
            res.status(400).send('Bad Request');
          }
        } else {
          next();
        }
      },
    });
    return config;
  },
})
export class VectorSearchPlugin {}

