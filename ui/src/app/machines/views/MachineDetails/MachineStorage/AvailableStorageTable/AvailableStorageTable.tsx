import { useState } from "react";

import { Input, MainTable } from "@canonical/react-components";
import classNames from "classnames";
import { useDispatch, useSelector } from "react-redux";

import ActionConfirm from "../ActionConfirm";
import BootStatus from "../BootStatus";
import NumaNodes from "../NumaNodes";
import TagLinks from "../TagLinks";
import TestStatus from "../TestStatus";
import {
  canBeDeleted,
  canBePartitioned,
  diskAvailable,
  formatType,
  formatSize,
  isDatastore,
  partitionAvailable,
  isVolumeGroup,
  canCreateLogicalVolume,
} from "../utils";

import AddLogicalVolume from "./AddLogicalVolume";
import AddPartition from "./AddPartition";
import EditPartition from "./EditPartition";

import DoubleRow from "app/base/components/DoubleRow";
import TableMenu from "app/base/components/TableMenu";
import type { TSFixMe } from "app/base/types";
import { actions as machineActions } from "app/store/machine";
import machineSelectors from "app/store/machine/selectors";
import type { Disk, Machine, Partition } from "app/store/machine/types";
import type { RootState } from "app/store/root/types";
import { generateCheckboxHandlers } from "app/utils";

type Expanded = {
  content:
    | "addLogicalVolume"
    | "addPartition"
    | "deleteDisk"
    | "deletePartition"
    | "deleteVolumeGroup"
    | "editPartition";
  id: string;
};

type Props = {
  canEditStorage: boolean;
  systemId: Machine["system_id"];
};

/**
 * Generate a unique ID for a disk or partition. Since both disks and partitions
 * are used in the table it's possible for the id number alone to be non-unique.
 * @param storageDevice - the disk or partition to create a unique ID for.
 * @returns unique ID for the disk or partition
 */
const uniqueId = (storageDevice: Disk | Partition) =>
  `${storageDevice.type}-${storageDevice.id}`;

/**
 * Generate the actions that a given disk can perform.
 * @param disk - the disk to check.
 * @param setExpanded - function to set the expanded table row and content.
 * @returns list of action links.
 */
const getDiskActions = (
  disk: Disk,
  setExpanded: (expanded: Expanded | null) => void
) => {
  const actions = [];
  const actionGenerator = (label: string, content: Expanded["content"]) => ({
    children: label,
    onClick: () => setExpanded({ content, id: uniqueId(disk) }),
  });

  if (canBePartitioned(disk)) {
    actions.push(actionGenerator("Add partition...", "addPartition"));
  }

  if (canCreateLogicalVolume(disk)) {
    actions.push(actionGenerator("Add logical volume...", "addLogicalVolume"));
  }

  if (canBeDeleted(disk)) {
    if (isVolumeGroup(disk)) {
      actions.push(
        actionGenerator("Remove volume group...", "deleteVolumeGroup")
      );
    } else {
      actions.push(
        actionGenerator(`Remove ${formatType(disk, true)}...`, "deleteDisk")
      );
    }
  }
  return actions;
};

/**
 * Normalise rendered row data so that both disks and partitions can be displayed.
 * @param storageDevice - the disk or partition to normalise.
 * @param canEditStorage - whether storage can be edited.
 * @param expanded - the currently expanded row and content.
 * @param actions - list of actions the storage device can perform.
 * @returns normalised row data
 */
const normaliseRowData = (
  storageDevice: Disk | Partition,
  canEditStorage: boolean,
  expanded: Expanded | null,
  selected: string[],
  handleRowCheckbox: (rowID: string, selected: string[]) => void,
  actions: TSFixMe[] // Replace TSFixMe with TableMenu actions type when converted to TS
) => {
  const rowId = uniqueId(storageDevice);
  const isExpanded = expanded?.id === rowId && Boolean(expanded?.content);

  return {
    className: isExpanded ? "p-table__row is-active" : null,
    columns: [
      {
        content: (
          <DoubleRow
            primary={
              <Input
                checked={selected.includes(rowId)}
                className="has-inline-label keep-label-opacity"
                disabled={!canEditStorage}
                id={rowId}
                label={storageDevice.name}
                onChange={() => handleRowCheckbox(rowId, selected)}
                type="checkbox"
                wrapperClassName="u-no-margin--bottom u-nudge--checkbox"
              />
            }
            secondary={"serial" in storageDevice && storageDevice.serial}
            secondaryClassName="u-nudge--secondary-row"
          />
        ),
      },
      {
        content: (
          <DoubleRow
            primary={"model" in storageDevice ? storageDevice.model : "—"}
            secondary={
              "firmware_version" in storageDevice &&
              storageDevice.firmware_version
            }
          />
        ),
      },
      {
        className: "u-align--center",
        content: (
          <DoubleRow
            primary={
              "is_boot" in storageDevice ? (
                <BootStatus disk={storageDevice} />
              ) : (
                "—"
              )
            }
          />
        ),
      },
      {
        content: <DoubleRow primary={formatSize(storageDevice.size)} />,
      },
      {
        content: (
          <DoubleRow
            primary={formatType(storageDevice)}
            secondary={
              ("numa_node" in storageDevice ||
                "numa_nodes" in storageDevice) && (
                <NumaNodes disk={storageDevice} />
              )
            }
          />
        ),
      },
      {
        content: (
          <DoubleRow
            primary={
              "test_status" in storageDevice ? (
                <TestStatus testStatus={storageDevice.test_status} />
              ) : (
                "—"
              )
            }
            secondary={<TagLinks tags={storageDevice.tags} />}
          />
        ),
      },
      {
        className: "u-align--right",
        content: (
          <TableMenu
            disabled={!canEditStorage || actions.length === 0}
            links={actions}
            position="right"
            title="Take action:"
          />
        ),
      },
    ],
    expanded: isExpanded,
    key: rowId,
  };
};

const AvailableStorageTable = ({
  canEditStorage,
  systemId,
}: Props): JSX.Element | null => {
  const dispatch = useDispatch();
  const machine = useSelector((state: RootState) =>
    machineSelectors.getById(state, systemId)
  );
  const [expanded, setExpanded] = useState<Expanded | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const {
    handleGroupCheckbox,
    handleRowCheckbox,
  } = generateCheckboxHandlers<string>((ids) => setSelected(ids));
  const closeExpanded = () => setExpanded(null);

  if (machine && "disks" in machine && "supported_filesystems" in machine) {
    const rows: TSFixMe[] = [];

    machine.disks.forEach((disk) => {
      if (diskAvailable(disk) && !isDatastore(disk.filesystem)) {
        const diskActions = getDiskActions(disk, setExpanded);
        const diskType = formatType(disk, true);

        rows.push({
          ...normaliseRowData(
            disk,
            canEditStorage,
            expanded,
            selected,
            handleRowCheckbox,
            diskActions
          ),
          expandedContent: (
            <div className="u-flex--grow">
              {expanded?.content === "addLogicalVolume" && (
                <AddLogicalVolume
                  closeExpanded={() => setExpanded(null)}
                  disk={disk}
                  systemId={machine.system_id}
                />
              )}
              {expanded?.content === "addPartition" && (
                <AddPartition
                  closeExpanded={() => setExpanded(null)}
                  disk={disk}
                  systemId={machine.system_id}
                />
              )}
              {expanded?.content === "deleteDisk" && (
                <ActionConfirm
                  closeExpanded={closeExpanded}
                  confirmLabel={`Remove ${diskType}`}
                  eventName="deleteDisk"
                  message={`Are you sure you want to remove this ${diskType}?`}
                  onConfirm={() => {
                    dispatch(machineActions.cleanup());
                    dispatch(
                      machineActions.deleteDisk({
                        blockId: disk.id,
                        systemId,
                      })
                    );
                  }}
                  onSaveAnalytics={{
                    action: `Delete ${diskType}`,
                    category: "Machine storage",
                    label: `Remove ${diskType}`,
                  }}
                  statusKey="deletingDisk"
                  systemId={systemId}
                />
              )}
              {expanded?.content === "deleteVolumeGroup" && (
                <ActionConfirm
                  closeExpanded={closeExpanded}
                  confirmLabel="Remove volume group"
                  eventName="deleteVolumeGroup"
                  message="Are you sure you want to remove this volume group?"
                  onConfirm={() => {
                    dispatch(machineActions.cleanup());
                    dispatch(
                      machineActions.deleteVolumeGroup({
                        systemId,
                        volumeGroupId: disk.id,
                      })
                    );
                  }}
                  onSaveAnalytics={{
                    action: "Delete volume group",
                    category: "Machine storage",
                    label: "Remove volume group",
                  }}
                  statusKey="deletingVolumeGroup"
                  systemId={systemId}
                />
              )}
            </div>
          ),
        });
      }

      if (disk.partitions) {
        disk.partitions.forEach((partition) => {
          if (
            partitionAvailable(partition) &&
            !isDatastore(partition.filesystem)
          ) {
            const partitionActions = [
              {
                children: "Remove partition...",
                onClick: () =>
                  setExpanded({
                    content: "deletePartition",
                    id: uniqueId(partition),
                  }),
              },
              {
                children: "Edit partition...",
                onClick: () =>
                  setExpanded({
                    content: "editPartition",
                    id: uniqueId(partition),
                  }),
              },
            ];

            rows.push({
              ...normaliseRowData(
                partition,
                canEditStorage,
                expanded,
                selected,
                handleRowCheckbox,
                partitionActions
              ),
              expandedContent: (
                <div className="u-flex--grow">
                  {expanded?.content === "deletePartition" && (
                    <ActionConfirm
                      closeExpanded={closeExpanded}
                      confirmLabel="Remove partition"
                      eventName="deletePartition"
                      message="Are you sure you want to remove this partition?"
                      onConfirm={() => {
                        dispatch(machineActions.cleanup());
                        dispatch(
                          machineActions.deletePartition({
                            partitionId: partition.id,
                            systemId,
                          })
                        );
                      }}
                      onSaveAnalytics={{
                        action: "Delete partition",
                        category: "Machine storage",
                        label: "Remove partition",
                      }}
                      statusKey="deletingPartition"
                      systemId={systemId}
                    />
                  )}
                  {expanded?.content === "editPartition" && (
                    <EditPartition
                      closeExpanded={() => setExpanded(null)}
                      disk={disk}
                      partition={partition}
                      systemId={machine.system_id}
                    />
                  )}
                </div>
              ),
            });
          }
        });
      }
    });

    const rowIds = rows.map((row) => row.key);

    return (
      <>
        <MainTable
          className="p-table-expanding--light"
          expanding
          headers={[
            {
              content: (
                <div className="u-flex">
                  <Input
                    checked={selected.length > 0}
                    className={classNames("has-inline-label", {
                      "p-checkbox--mixed": selected.length !== rows.length,
                    })}
                    data-test="all-disks-checkbox"
                    disabled={rows.length === 0}
                    id="all-disks-checkbox"
                    label={" "}
                    onChange={() => handleGroupCheckbox(rowIds, selected)}
                    type="checkbox"
                    wrapperClassName="u-no-margin--bottom u-align-header-checkbox u-nudge--checkbox"
                  />
                  <div>
                    <div>Name</div>
                    <div>Serial</div>
                  </div>
                </div>
              ),
            },
            {
              content: (
                <div>
                  <div>Model</div>
                  <div>Firmware</div>
                </div>
              ),
            },
            {
              className: "u-align--center",
              content: <div>Boot</div>,
            },
            {
              content: <div>Size</div>,
            },
            {
              content: (
                <div>
                  <div>Type</div>
                  <div>NUMA node</div>
                </div>
              ),
            },
            {
              content: (
                <div>
                  <div>Health</div>
                  <div>Tags</div>
                </div>
              ),
            },
            {
              className: "u-align--right",
              content: <div>Actions</div>,
            },
          ]}
          rows={rows}
        />
        {rows.length === 0 && (
          <div className="u-nudge-right--small" data-test="no-available">
            No available disks or partitions.
          </div>
        )}
      </>
    );
  }
  return null;
};

export default AvailableStorageTable;