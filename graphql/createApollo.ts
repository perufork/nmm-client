import { ApolloClient } from 'apollo-client'
import {
  InMemoryCache,
  NormalizedCacheObject,
  defaultDataIdFromObject
} from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import { typeDefs } from './schema'
import { resolvers, ACCESS_TOKEN } from './resolvers'
import logger from '../utils/logger'

import { AccessTokenObject } from './types'

const isServer = () => typeof window === 'undefined'

export default (initialState: NormalizedCacheObject) => {
  const cache: InMemoryCache = new InMemoryCache().restore(initialState)

  const httpLink: HttpLink = new HttpLink({
    uri: process.env.SERVER_URI,
    credentials: 'include'
  })

  const authLink = setContext((_, previousContext) => {
    /**
     * @remark check if browser b/c it'll crash if tries to use localstorage
     * api on server side
     */
    const isBrowser: boolean = typeof window !== 'undefined'
    let signedIn: string
    let data: AccessTokenObject = {}

    // TODO - update signed_in when user logs out or refreshes page
    // TODO - need to remove signed in value from local storage.
    if (isBrowser) {
      signedIn = localStorage.getItem('signed_in') || ''
      if (signedIn == 'true') {
        logger.log({
          level: 'INFO',
          description: 'CreateApollo - retrieving access token from cache.'
        })
        data = cache.readQuery({ query: ACCESS_TOKEN }) || {}
      }
    }

    return {
      headers: {
        ...previousContext.headers,
        authorization: data.accessToken ? `Bearer ${data.accessToken}` : '',
        'Access-Control-Allow-Origin': process.env.CLIENT_URI
      }
    }
  })

  return new ApolloClient({
    name: 'No Meat May',
    version: 'v0.0.0',
    cache,
    link: authLink.concat(httpLink),
    connectToDevTools: !isServer(),
    // Disables forceFetch on the server (so queries are only run once)
    ssrMode: isServer(),
    typeDefs,
    resolvers
  })
}
