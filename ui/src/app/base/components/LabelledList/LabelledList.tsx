import { List } from "@canonical/react-components";
import classNames from "classnames";
import React from "react";
import type { ReactNode } from "react";

type LabelledListItem = {
  label: ReactNode;
  value: ReactNode;
};

type Props = {
  className?: string;
  items: LabelledListItem[];
};

const LabelledList = ({ className, items }: Props): JSX.Element => {
  return (
    <List
      className={classNames("p-list--labelled", className)}
      items={items.map(({ label, value }) => (
        <>
          <div className="p-list__item-label">{label}</div>
          <div className="p-list__item-value">{value}</div>
        </>
      ))}
    />
  );
};

export default LabelledList;
