/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import type PouchDB from 'pouchdb';

let PouchDBRuntime: any;

if (typeof window !== 'undefined') {
  PouchDBRuntime = require('pouchdb').default || require('pouchdb');
  const PouchDBFind = require('pouchdb-find').default || require('pouchdb-find');
  const PouchDBAuth = require('pouchdb-authentication').default || require('pouchdb-authentication');
  
  PouchDBRuntime.plugin(PouchDBFind);
  PouchDBRuntime.plugin(PouchDBAuth);
}

// Determine the couchDB URL. Default locally for dev.
const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984';
const DB_NAME = 'lms';

// A singleton instance cache
let localDB: PouchDB.Database | null = null;
let remoteDB: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<Record<string, unknown>> | null = null;

export const getLocalDB = () => {
  if (!localDB && typeof window !== 'undefined') {
    localDB = new PouchDBRuntime(DB_NAME);
  }
  return localDB as PouchDB.Database;
};

export const getRemoteDB = () => {
  if (!remoteDB && typeof window !== 'undefined') {
    remoteDB = new PouchDBRuntime(`${COUCHDB_URL}/${DB_NAME}`, { skip_setup: true }); 
  }
  return remoteDB as PouchDB.Database;
};

export const startSync = () => {
  const local = getLocalDB();
  const remote = getRemoteDB();

  if (!syncHandler && local && remote) {
    syncHandler = local.sync(remote, {
      live: true,
      retry: true
    }).on('change', function (info: any) {
      console.log('Sync change:', info);
    }).on('paused', function (err: any) {
      console.log('Sync paused (offline?)', err);
    }).on('active', function () {
      console.log('Sync active (online)');
    }).on('denied', function (err: any) {
      console.error('Sync denied', err);
    }).on('complete', function (info: any) {
      console.log('Sync complete', info);
    }).on('error', function (err: any) {
      console.error('Sync error', err);
    });
  }
  return syncHandler;
};

export const stopSync = () => {
  if (syncHandler) {
    syncHandler.cancel();
    syncHandler = null;
  }
};
