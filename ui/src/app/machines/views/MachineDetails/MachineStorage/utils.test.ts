import {
  canBeDeleted,
  canBeFormatted,
  canBePartitioned,
  canCreateLogicalVolume,
  diskAvailable,
  formatSize,
  formatType,
  isBcache,
  isCacheSet,
  isDatastore,
  isLogicalVolume,
  isMounted,
  isPartition,
  isPhysical,
  isRaid,
  isVirtual,
  partitionAvailable,
  usesStorage,
} from "./utils";

import { MIN_PARTITION_SIZE } from "app/store/machine/constants";
import { DiskTypes } from "app/store/machine/types";
import {
  machineDisk as diskFactory,
  machineFilesystem as fsFactory,
  machinePartition as partitionFactory,
} from "testing/factories";

describe("Machine storage utils", () => {
  describe("canBeDeleted", () => {
    it("handles null case", () => {
      expect(canBeDeleted(null)).toBe(false);
    });

    it("returns whether a volume group can be deleted", () => {
      const deletable = diskFactory({
        type: DiskTypes.VOLUME_GROUP,
        used_size: 0,
      });
      const nonDeletable = diskFactory({
        type: DiskTypes.VOLUME_GROUP,
        used_size: 1000,
      });
      expect(canBeDeleted(deletable)).toBe(true);
      expect(canBeDeleted(nonDeletable)).toBe(false);
    });

    it("returns whether a non-volume group disk can be deleted", () => {
      const deletable = diskFactory({
        type: DiskTypes.PHYSICAL,
        partitions: [],
      });
      const nonDeletable = diskFactory({
        type: DiskTypes.PHYSICAL,
        partitions: [partitionFactory()],
      });
      expect(canBeDeleted(deletable)).toBe(true);
      expect(canBeDeleted(nonDeletable)).toBe(false);
    });
  });

  describe("canBeFormatted", () => {
    it("handles null case", () => {
      expect(canBeFormatted(null)).toBe(false);
    });

    it("returns whether a filesystem can be formatted", () => {
      const formattable = fsFactory({ is_format_fstype: true });
      const notFormattable = fsFactory({ is_format_fstype: false });
      expect(canBeFormatted(formattable)).toBe(true);
      expect(canBeFormatted(notFormattable)).toBe(false);
    });
  });

  describe("canBePartitioned", () => {
    it("handles null case", () => {
      expect(canBePartitioned(null)).toBe(false);
    });

    it("handles physical disks with available space", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        type: DiskTypes.PHYSICAL,
      });
      expect(canBePartitioned(disk)).toBe(true);
    });

    it("handles formatted disks", () => {
      const disk = diskFactory({ filesystem: fsFactory({ fstype: "fat32" }) });
      expect(canBePartitioned(disk)).toBe(false);
    });

    it("handles volume groups", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        type: DiskTypes.VOLUME_GROUP,
      });
      expect(canBePartitioned(disk)).toBe(false);
    });

    it("handles logical volumes", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        parent: {
          id: 1,
          type: DiskTypes.VOLUME_GROUP,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      expect(canBePartitioned(disk)).toBe(false);
    });

    it("handles bcaches", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        parent: {
          id: 1,
          type: DiskTypes.BCACHE,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      expect(canBePartitioned(disk)).toBe(false);
    });
  });

  describe("canCreateLogicalVolume", () => {
    it("handles null case", () => {
      expect(canCreateLogicalVolume(null)).toBe(false);
    });

    it("handles disks that are not volume groups", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        type: DiskTypes.PHYSICAL,
      });
      expect(canCreateLogicalVolume(disk)).toBe(false);
    });

    it("handles mounted volume groups with available space", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        filesystem: fsFactory(),
        type: DiskTypes.VOLUME_GROUP,
      });
      expect(canCreateLogicalVolume(disk)).toBe(false);
    });

    it("handles unmounted volume groups with available space", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        type: DiskTypes.VOLUME_GROUP,
      });
      expect(canCreateLogicalVolume(disk)).toBe(true);
    });
  });

  describe("diskAvailable", () => {
    it("handles null case", () => {
      expect(diskAvailable(null)).toBe(false);
    });

    it("handles disks with available space", () => {
      const disk = diskFactory({
        available_size: MIN_PARTITION_SIZE + 1,
        type: DiskTypes.PHYSICAL,
      });
      expect(diskAvailable(disk)).toBe(true);
    });

    it("handles cache sets", () => {
      const cacheSet = diskFactory({ type: DiskTypes.CACHE_SET });
      expect(diskAvailable(cacheSet)).toBe(false);
    });

    it("handles mounted disks", () => {
      const mounted = diskFactory({
        filesystem: fsFactory({ mount_point: "/path" }),
      });
      expect(diskAvailable(mounted)).toBe(false);
    });
  });

  describe("formatSize", () => {
    it("handles null case", () => {
      expect(formatSize(null)).toBe("—");
      expect(formatSize(0)).toBe("—");
    });

    it("can format size", () => {
      expect(formatSize(100)).toBe("100 B");
      expect(formatSize(10000)).toBe("10 KB");
    });
  });

  describe("formatType", () => {
    it("handles null case", () => {
      expect(formatType(null)).toBe("Unknown");
    });

    it("handles cache sets", () => {
      const disk = diskFactory({ type: DiskTypes.CACHE_SET });
      expect(formatType(disk)).toBe("Cache set");
      expect(formatType(disk, true)).toBe("cache set");
    });

    it("handles ISCSIs", () => {
      const disk = diskFactory({ type: DiskTypes.ISCSI });
      expect(formatType(disk)).toBe("ISCSI");
    });

    it("handles logical volumes", () => {
      const disk = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.VOLUME_GROUP,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      expect(formatType(disk)).toBe("Logical volume");
      expect(formatType(disk, true)).toBe("logical volume");
    });

    it("handles partitions", () => {
      const partition = partitionFactory({ type: "partition" });
      expect(formatType(partition)).toBe("Partition");
      expect(formatType(partition, true)).toBe("partition");
    });

    it("handles physical disks", () => {
      const disk = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(formatType(disk)).toBe("Physical");
      expect(formatType(disk, true)).toBe("physical disk");
    });

    it("handles RAIDs", () => {
      const disk = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.RAID_0,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      expect(formatType(disk)).toBe("RAID 0");
    });

    it("handles VMFS6 datastores", () => {
      const partition = partitionFactory({ type: "vmfs6" });
      expect(formatType(partition)).toBe("VMFS6");
    });

    it("handles virtual disks", () => {
      const disk = diskFactory({ type: DiskTypes.VIRTUAL });
      expect(formatType(disk)).toBe("Virtual");
      expect(formatType(disk, true)).toBe("virtual disk");
    });

    it("handles volume groups", () => {
      const disk = diskFactory({ type: DiskTypes.VOLUME_GROUP });
      expect(formatType(disk)).toBe("Volume group");
      expect(formatType(disk, true)).toBe("volume group");
    });
  });

  describe("isBcache", () => {
    it("returns whether a disk is a bcache", () => {
      const bcache = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.BCACHE,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      const notBcache = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(isBcache(null)).toBe(false);
      expect(isBcache(notBcache)).toBe(false);
      expect(isBcache(bcache)).toBe(true);
    });
  });

  describe("isCacheSet", () => {
    it("returns whether a disk is a cache set", () => {
      const cacheSet = diskFactory({ type: DiskTypes.CACHE_SET });
      const notCacheSet = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(isCacheSet(null)).toBe(false);
      expect(isCacheSet(notCacheSet)).toBe(false);
      expect(isCacheSet(cacheSet)).toBe(true);
    });
  });

  describe("isDatastore", () => {
    it("returns whether a filesystem is a datastore", () => {
      const datastore = fsFactory({ fstype: "vmfs6" });
      const notDatastore = fsFactory({ fstype: "fat32" });
      expect(isDatastore(null)).toBe(false);
      expect(isDatastore(notDatastore)).toBe(false);
      expect(isDatastore(datastore)).toBe(true);
    });
  });

  describe("isLogicalVolume", () => {
    it("returns whether a disk is a logical volume", () => {
      const logicalVolume = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.VOLUME_GROUP,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      const notLogicalVolume = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(isLogicalVolume(null)).toBe(false);
      expect(isLogicalVolume(notLogicalVolume)).toBe(false);
      expect(isLogicalVolume(logicalVolume)).toBe(true);
    });
  });

  describe("isMounted", () => {
    it("returns whether a filesystem is mounted", () => {
      const mounted = fsFactory({ mount_point: "/" });
      const notMounted = fsFactory({ mount_point: "" });
      expect(isMounted(null)).toBe(false);
      expect(isMounted(notMounted)).toBe(false);
      expect(isMounted(mounted)).toBe(true);
    });

    it("handles reserved filesystems", () => {
      const reserved = fsFactory({ mount_point: "RESERVED" });
      expect(isMounted(reserved)).toBe(false);
    });
  });

  describe("isPartition", () => {
    it("returns whether a storage device is a partition", () => {
      const disk = diskFactory({ type: DiskTypes.PHYSICAL });
      const partition = partitionFactory({ type: "partition" });
      expect(isPartition(null)).toBe(false);
      expect(isPartition(disk)).toBe(false);
      expect(isPartition(partition)).toBe(true);
    });
  });

  describe("isRaid", () => {
    it("returns whether a disk is a RAID", () => {
      const raid = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.RAID_0,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      const notRaid = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(isRaid(null)).toBe(false);
      expect(isRaid(notRaid)).toBe(false);
      expect(isRaid(raid)).toBe(true);
    });
  });

  describe("isPhysical", () => {
    it("returns whether a disk is a physical disk", () => {
      const physical = diskFactory({ type: DiskTypes.PHYSICAL });
      const notPhysical = diskFactory({ type: DiskTypes.VIRTUAL });
      expect(isPhysical(null)).toBe(false);
      expect(isPhysical(notPhysical)).toBe(false);
      expect(isPhysical(physical)).toBe(true);
    });
  });

  describe("isVirtual", () => {
    it("returns whether a disk is a virtual disk", () => {
      const virtual = diskFactory({
        parent: {
          id: 1,
          type: DiskTypes.RAID_0,
          uuid: "abc123",
        },
        type: DiskTypes.VIRTUAL,
      });
      const notVirtual = diskFactory({ type: DiskTypes.PHYSICAL });
      expect(isVirtual(null)).toBe(false);
      expect(isVirtual(notVirtual)).toBe(false);
      expect(isVirtual(virtual)).toBe(true);
    });
  });

  describe("partitionAvailable", () => {
    it("handles null case", () => {
      expect(partitionAvailable(null)).toBe(false);
    });

    it("handles mounted partitions", () => {
      const partition = partitionFactory({
        filesystem: fsFactory({ mount_point: "/path" }),
      });
      expect(partitionAvailable(partition)).toBe(false);
    });

    it("handles unmounted partitions that can be formatted", () => {
      const partition = partitionFactory({
        filesystem: fsFactory({ is_format_fstype: true, mount_point: "" }),
      });
      expect(partitionAvailable(partition)).toBe(true);
    });
  });

  describe("usesStorage", () => {
    it("handles null case", () => {
      expect(usesStorage(null)).toBe(false);
    });

    it("returns whether a filesystem uses storage", () => {
      const fs1 = fsFactory({ fstype: "fat32" });
      const fs2 = fsFactory({ fstype: "ramfs" });
      const fs3 = fsFactory({ fstype: "tmpfs" });
      expect(usesStorage(fs1)).toBe(true);
      expect(usesStorage(fs2)).toBe(false);
      expect(usesStorage(fs3)).toBe(false);
    });
  });
});