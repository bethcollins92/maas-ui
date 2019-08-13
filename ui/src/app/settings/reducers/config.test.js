import config from "./config";

describe("config reducer", () => {
  it("should return the initial state", () => {
    expect(config(undefined, {})).toEqual({
      loading: false,
      loaded: false,
      saving: false,
      items: []
    });
  });

  it("should correctly reduce FETCH_CONFIG_START", () => {
    expect(
      config(undefined, {
        type: "FETCH_CONFIG_START"
      })
    ).toEqual({
      loading: true,
      loaded: false,
      saving: false,
      items: []
    });
  });

  it("should correctly reduce FETCH_CONFIG_SUCCESS", () => {
    expect(
      config(
        {
          loading: true,
          loaded: false,
          saving: false,
          items: []
        },
        {
          type: "FETCH_CONFIG_SUCCESS",
          payload: [
            { name: "default_storage_layout", value: "bcache" },
            { name: "enable_disk_erasing_on_release", value: "foo" }
          ]
        }
      )
    ).toEqual({
      loading: false,
      loaded: true,
      saving: false,
      items: [
        { name: "default_storage_layout", value: "bcache" },
        { name: "enable_disk_erasing_on_release", value: "foo" }
      ]
    });
  });

  it("should correctly reduce UPDATE_CONFIG_START", () => {
    expect(
      config(
        {
          loading: false,
          loaded: false,
          saving: false,
          items: []
        },
        {
          type: "UPDATE_CONFIG_START"
        }
      )
    ).toEqual({
      loading: false,
      loaded: false,
      saving: true,
      items: []
    });
  });

  it("should correctly reduce UPDATE_CONFIG_SUCCESS", () => {
    expect(
      config(
        {
          loading: false,
          loaded: false,
          saving: true,
          items: [{ name: "default_storage_layout", value: "bcache" }]
        },
        {
          type: "UPDATE_CONFIG_SUCCESS",
          payload: { name: "default_storage_layout", value: "flat" }
        }
      )
    ).toEqual({
      loading: false,
      loaded: false,
      saving: false,
      items: [{ name: "default_storage_layout", value: "flat" }]
    });
  });
});
