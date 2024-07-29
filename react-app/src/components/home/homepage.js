import React from 'react';
import Hero from "./Hero";
// @ts-ignore
import AOS from 'aos';

class HomePage extends React.Component {

  constructor(props: {}, context: any) {
    super(props, context);
    AOS.init({
      duration: 2000
    });
  }

  componentWillReceiveProps (){ 
    AOS.refresh(); 
  } 

  render() {
    return (
    <div className="homePage">
      <Hero />
    </div>
  );
  }
}


export default HomePage;