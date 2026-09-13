import { beforeEach, afterEach, expect, it, vi } from "vitest";
let data: Map<string,string>;
beforeEach(() => {
  vi.resetModules();
  data = new Map();
  vi.stubGlobal("window", {dispatchEvent:vi.fn()});
  vi.stubGlobal("localStorage", {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});
});
afterEach(() => vi.unstubAllGlobals());
it("retries progress sync after an anonymous request and subsequent login", async () => {
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(null,{status:401})).mockResolvedValueOnce(Response.json({synced:true,keys:["GEN:1"],username:"ndilthey"}));
  vi.stubGlobal("fetch",fetchMock);
  const {initReadProgressSync,getReadChapterKeys}=await import("@/lib/bible/reading-storage");
  await initReadProgressSync();
  await initReadProgressSync();
  expect(getReadChapterKeys()).toEqual(["GEN:1"]);
});
it("retries failed local-progress migration rather than marking it synced", async () => {
  data.set("biblio-read-chapters",'["GEN:1"]');
  const remote=()=>Response.json({synced:true,keys:[],username:"ndilthey"});
  const fetchMock=vi.fn().mockResolvedValueOnce(remote()).mockResolvedValueOnce(new Response(null,{status:503})).mockResolvedValueOnce(remote()).mockResolvedValueOnce(new Response(null,{status:204}));
  vi.stubGlobal("fetch",fetchMock);
  const {initReadProgressSync,getReadChapterKeys}=await import("@/lib/bible/reading-storage");
  await initReadProgressSync();
  expect(data.has("biblio-read-progress-owner")).toBe(false);
  await initReadProgressSync();
  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(getReadChapterKeys()).toEqual(["GEN:1"]);
  expect(data.get("biblio-read-progress-owner")).toBe("ndilthey");
});
