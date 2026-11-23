import { createApi } from '@reduxjs/toolkit/query/react';
import {demoRequest} from '../demo/data';
export const origin='';
export const modules={website:true,pos:true};
export let currentActor='1:1';
export const csrf=async()=>{};
export const request=demoRequest;
export const queryString = (params) =>
  new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    ),
  ).toString();
export const api = createApi({
  reducerPath: "api",
  tagTypes: ["Business", "Session"],
  keepUnusedDataFor: 30,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  baseQuery: async (arg, context) => {
    try {
      return {
        data: await request(typeof arg === "string" ? arg : arg.path, {
          ...arg,
          signal: context.signal,
        }),
      };
    } catch (error) {
      if (error.status === 401 && !(arg.path ?? arg).includes("/auth/"))
        context.dispatch({ type: "session/expired" });
      return {
        error: {
          status: error.status ?? "ERROR",
          message: error.message,
          code: error.code,
          fields: error.fields,
        },
      };
    }
  },
  endpoints: (build) => ({
    read: build.query({ query: (path) => path, providesTags: ["Business"] }),
    me: build.query({
      query: () => "/api/v1/auth/me",
      providesTags: ["Session"],
    }),
  }),
});
export const { useReadQuery, useMeQuery } = api;
