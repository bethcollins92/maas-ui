import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react-hooks";
import configureStore from "redux-mock-store";
import React from "react";
import type { MockStoreEnhanced } from "redux-mock-store";
import type { ReactNode } from "react";

import {
  architecturesState as architecturesStateFactory,
  generalState as generalStateFactory,
  machine as machineFactory,
  machineEvent as machineEventFactory,
  machineState as machineStateFactory,
  osInfo as osInfoFactory,
  osInfoState as osInfoStateFactory,
  powerType as powerTypeFactory,
  powerTypesState as powerTypesStateFactory,
  rootState as rootStateFactory,
} from "testing/factories";
import { nodeStatus } from "app/base/enum";
import { NodeStatus } from "app/store/types/node";
import type { Machine } from "app/store/machine/types";
import type { RootState } from "app/store/root/types";

import {
  canOsSupportBcacheZFS,
  canOsSupportStorageConfig,
  isMachineStorageConfigurable,
  useCanEdit,
  useFormattedOS,
  useHasInvalidArchitecture,
  useIsAllNetworkingDisabled,
  useIsRackControllerConnected,
} from "./utils";

const mockStore = configureStore();

const generateWrapper = (store: MockStoreEnhanced<unknown>) => ({
  children,
}: {
  children: ReactNode;
}) => <Provider store={store}>{children}</Provider>;

describe("machine utils", () => {
  let state: RootState;
  let machine: Machine | null;

  beforeEach(() => {
    machine = machineFactory({
      architecture: "amd64",
      events: [machineEventFactory()],
      locked: false,
      permissions: ["edit"],
      system_id: "abc123",
    });
    state = rootStateFactory({
      general: generalStateFactory({
        architectures: architecturesStateFactory({
          data: ["amd64"],
        }),
        osInfo: osInfoStateFactory({
          data: osInfoFactory(),
        }),
        powerTypes: powerTypesStateFactory({
          data: [powerTypeFactory()],
        }),
      }),
      machine: machineStateFactory({
        items: [machine],
      }),
    });
  });

  describe("useHasInvalidArchitecture", () => {
    it("can return a valid result", () => {
      const store = mockStore(state);
      const { result } = renderHook(() => useHasInvalidArchitecture(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });

    it("handles a machine that has no architecture", () => {
      state.machine.items[0].architecture = "";
      const store = mockStore(state);
      const { result } = renderHook(() => useHasInvalidArchitecture(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("handles an architecture with no match", () => {
      state.machine.items[0].architecture = "unknown";
      const store = mockStore(state);
      const { result } = renderHook(() => useHasInvalidArchitecture(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });
  });

  describe("useIsRackControllerConnected", () => {
    it("handles a connected state", () => {
      state.general.powerTypes = powerTypesStateFactory({
        data: [powerTypeFactory()],
      });
      const store = mockStore(state);
      const { result } = renderHook(() => useIsRackControllerConnected(), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("handles a disconnected state", () => {
      state.general.powerTypes.data = [];
      const store = mockStore(state);
      const { result } = renderHook(() => useIsRackControllerConnected(), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });
  });

  describe("useFormattedOS", () => {
    it("handles null case", () => {
      const store = mockStore(state);

      const { result } = renderHook(() => useFormattedOS(null), {
        wrapper: generateWrapper(store),
      });

      expect(result.current).toBe("");
    });

    it("handles Ubuntu releases", () => {
      state.machine.items[0].osystem = "ubuntu";
      state.machine.items[0].distro_series = "focal";
      state.general.osInfo.data = osInfoFactory({
        releases: [["ubuntu/focal", 'Ubuntu 20.04 LTS "Focal Fossa"']],
      });
      const store = mockStore(state);

      const { result } = renderHook(() => useFormattedOS(machine), {
        wrapper: generateWrapper(store),
      });

      expect(result.current).toBe("Ubuntu 20.04 LTS");
    });

    it("handles non-Ubuntu releases", () => {
      state.machine.items[0].osystem = "centos";
      state.machine.items[0].distro_series = "centos70";
      state.general.osInfo.data = osInfoFactory({
        releases: [["centos/centos70", "CentOS 7"]],
      });
      const store = mockStore(state);

      const { result } = renderHook(() => useFormattedOS(machine), {
        wrapper: generateWrapper(store),
      });

      expect(result.current).toBe("CentOS 7");
    });
  });

  describe("useCanEdit", () => {
    it("handles an editable machine", () => {
      const store = mockStore(state);
      const { result } = renderHook(() => useCanEdit(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("handles incorrect permissions", () => {
      state.machine.items[0].permissions = [];
      const store = mockStore(state);
      const { result } = renderHook(() => useCanEdit(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });

    it("handles a locked machine", () => {
      state.machine.items[0].locked = true;
      const store = mockStore(state);
      const { result } = renderHook(() => useCanEdit(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });

    it("handles a disconnected rack controller", () => {
      state.general.powerTypes.data = [];
      const store = mockStore(state);
      const { result } = renderHook(() => useCanEdit(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });

    it("can ignore the rack controller state", () => {
      state.general.powerTypes.data = [];
      const store = mockStore(state);
      const { result } = renderHook(() => useCanEdit(machine, true), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });
  });

  describe("isMachineStorageConfigurable", () => {
    it("handles a machine in a configurable state", () => {
      expect(
        isMachineStorageConfigurable(
          machineFactory({ status_code: nodeStatus.READY })
        )
      ).toBe(true);
      expect(
        isMachineStorageConfigurable(
          machineFactory({ status_code: nodeStatus.ALLOCATED })
        )
      ).toBe(true);
    });

    it("handles a machine in a non-configurable state", () => {
      expect(
        isMachineStorageConfigurable(
          machineFactory({ status_code: nodeStatus.NEW })
        )
      ).toBe(false);
    });
  });

  describe("canOsSupportBcacheZFS", () => {
    it("handles a machine that supports bcache and ZFS", () => {
      expect(canOsSupportBcacheZFS(machineFactory({ osystem: "ubuntu" }))).toBe(
        true
      );
    });

    it("handles a machine that does not support bcache and ZFS", () => {
      expect(canOsSupportBcacheZFS(machineFactory({ osystem: "centos" }))).toBe(
        false
      );
    });
  });

  describe("canOsSupportStorageConfig", () => {
    it("handles a machine that supports configurating storage layout", () => {
      expect(
        canOsSupportStorageConfig(machineFactory({ osystem: "ubuntu" }))
      ).toBe(true);
    });

    it("handles a machine that does not support configurating storage layout", () => {
      expect(
        canOsSupportStorageConfig(machineFactory({ osystem: "windows" }))
      ).toBe(false);
    });
  });

  describe("useIsAllNetworkingDisabled", () => {
    it("is disabled when machine is not editable", () => {
      machine = machineFactory({
        permissions: [],
        system_id: "abc123",
      });
      const store = mockStore(state);
      const { result } = renderHook(() => useIsAllNetworkingDisabled(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("is disabled when there is no machine", () => {
      const store = mockStore(state);
      const { result } = renderHook(() => useIsAllNetworkingDisabled(null), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("is disabled when the machine has the wrong status", () => {
      machine = machineFactory({
        status: NodeStatus.DEPLOYING,
        system_id: "abc123",
      });
      const store = mockStore(state);
      const { result } = renderHook(() => useIsAllNetworkingDisabled(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(true);
    });

    it("can be not disabled", () => {
      const store = mockStore(state);
      const { result } = renderHook(() => useIsAllNetworkingDisabled(machine), {
        wrapper: generateWrapper(store),
      });
      expect(result.current).toBe(false);
    });
  });
});
