import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import React from "react";
import type { RootState } from "app/store/root/types";

import {
  generalState as generalStateFactory,
  machine as machineFactory,
  machineAction as machineActionFactory,
  machineActionsState as machineActionsStateFactory,
  machineState as machineStateFactory,
  machineStatus as machineStatusFactory,
  machineStatuses as machineStatusesFactory,
  rootState as rootStateFactory,
  scripts as scriptsFactory,
  scriptsState as scriptsStateFactory,
} from "testing/factories";
import CommissionForm from "./CommissionForm";

const mockStore = configureStore();

describe("CommissionForm", () => {
  let initialState: RootState;
  beforeEach(() => {
    initialState = rootStateFactory({
      general: generalStateFactory({
        machineActions: machineActionsStateFactory({
          data: [
            machineActionFactory({
              name: "commission",
              title: "Commission",
            }),
          ],
        }),
      }),
      machine: machineStateFactory({
        loaded: true,
        items: [
          machineFactory({ system_id: "abc123" }),
          machineFactory({ system_id: "def456" }),
        ],
        statuses: machineStatusesFactory({
          abc123: machineStatusFactory(),
          def456: machineStatusFactory(),
        }),
      }),
      scripts: scriptsStateFactory({
        loaded: true,
        items: [
          scriptsFactory({
            name: "smartctl-validate",
            tags: ["commissioning", "storage"],
            parameters: {
              storage: {
                argument_format: "{path}",
                type: "storage",
              },
            },
            type: 2,
          }),
          scriptsFactory({
            name: "custom-commissioning-script",
            tags: ["node"],
            type: 0,
          }),
        ],
      }),
    });
  });

  it("fetches the necessary data on load", () => {
    const state = { ...initialState };
    const store = mockStore(state);
    mount(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[{ pathname: "/machines", key: "testKey" }]}
        >
          <CommissionForm setSelectedAction={jest.fn()} />
        </MemoryRouter>
      </Provider>
    );

    expect(
      store.getActions().some((action) => action.type === "FETCH_SCRIPTS")
    ).toBe(true);
  });

  it("correctly dispatches actions to commission selected machines in machine list", () => {
    const state = { ...initialState };
    state.machine.selected = ["abc123", "def456"];
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[{ pathname: "/machines", key: "testKey" }]}
        >
          <CommissionForm setSelectedAction={jest.fn()} />
        </MemoryRouter>
      </Provider>
    );

    act(() =>
      wrapper
        .find("Formik")
        .props()
        .onSubmit({
          enableSSH: true,
          skipBMCConfig: true,
          skipNetworking: true,
          skipStorage: true,
          updateFirmware: true,
          configureHBA: true,
          testingScripts: [state.scripts.items[0]],
          commissioningScripts: [state.scripts.items[1]],
          scriptInputs: { testingScript0: { url: "www.url.com" } },
        })
    );
    expect(
      store
        .getActions()
        .filter((action) => action.type === "machine/commission")
    ).toStrictEqual([
      {
        type: "machine/commission",
        meta: {
          model: "machine",
          method: "action",
        },
        payload: {
          params: {
            action: "commission",
            extra: {
              enable_ssh: true,
              skip_bmc_config: true,
              skip_networking: true,
              skip_storage: true,
              commissioning_scripts: [
                state.scripts.items[1].id,
                "update_firmware",
                "configure_hba",
              ],
              testing_scripts: [state.scripts.items[0].id],
              script_input: { testingScript0: { url: "www.url.com" } },
            },
            system_id: "abc123",
          },
        },
      },
      {
        type: "machine/commission",
        meta: {
          model: "machine",
          method: "action",
        },
        payload: {
          params: {
            action: "commission",
            extra: {
              enable_ssh: true,
              skip_bmc_config: true,
              skip_networking: true,
              skip_storage: true,
              commissioning_scripts: [
                state.scripts.items[1].id,
                "update_firmware",
                "configure_hba",
              ],
              testing_scripts: [state.scripts.items[0].id],
              script_input: { testingScript0: { url: "www.url.com" } },
            },
            system_id: "def456",
          },
        },
      },
    ]);
  });

  it("correctly dispatches action to commission machine from details view", () => {
    const state = { ...initialState };
    state.machine.active = "abc123";
    state.machine.selected = [];
    const store = mockStore(state);
    const wrapper = mount(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[{ pathname: "/machine/abc123", key: "testKey" }]}
        >
          <Route
            exact
            path="/machine/:id"
            component={() => <CommissionForm setSelectedAction={jest.fn()} />}
          />
        </MemoryRouter>
      </Provider>
    );

    act(() =>
      wrapper
        .find("Formik")
        .props()
        .onSubmit({
          enableSSH: true,
          skipBMCConfig: true,
          skipNetworking: true,
          skipStorage: true,
          updateFirmware: true,
          configureHBA: true,
          testingScripts: [state.scripts.items[0]],
          commissioningScripts: [state.scripts.items[1]],
          scriptInputs: { testingScript0: { url: "www.url.com" } },
        })
    );
    expect(
      store
        .getActions()
        .filter((action) => action.type === "machine/commission")
    ).toStrictEqual([
      {
        type: "machine/commission",
        meta: {
          model: "machine",
          method: "action",
        },
        payload: {
          params: {
            action: "commission",
            extra: {
              enable_ssh: true,
              skip_bmc_config: true,
              skip_networking: true,
              skip_storage: true,
              commissioning_scripts: [
                state.scripts.items[1].id,
                "update_firmware",
                "configure_hba",
              ],
              testing_scripts: [state.scripts.items[0].id],
              script_input: { testingScript0: { url: "www.url.com" } },
            },
            system_id: "abc123",
          },
        },
      },
    ]);
  });
});
