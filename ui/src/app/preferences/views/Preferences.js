import React from "react";

import Routes from "app/preferences/components/Routes";
import Section from "app/base/components/Section";
import Nav from "app/preferences/components/Nav";

const Preferences = () => (
  <Section header="My preferences" sidebar={<Nav />}>
    <Routes />
  </Section>
);

export default Preferences;
