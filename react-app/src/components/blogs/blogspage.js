import React from "react";

class BlogsPage extends  React.Component<any, any> {
    render() {

        return (
            <div style={{textAlign:"center", marginLeft:"20%", marginRight:"20%"}}>
                <svg fill="green" width="24px" height="24px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><title>Medium icon</title><path d="M0 0v24h24V0H0zm19.938 5.686L18.651 6.92a.376.376 0 0 0-.143.362v9.067a.376.376 0 0 0 .143.361l1.257 1.234v.271h-6.322v-.27l1.302-1.265c.128-.128.128-.165.128-.36V8.99l-3.62 9.195h-.49L6.69 8.99v6.163a.85.85 0 0 0 .233.707l1.694 2.054v.271H3.815v-.27L5.51 15.86a.82.82 0 0 0 .218-.707V8.027a.624.624 0 0 0-.203-.527L4.019 5.686v-.27h4.674l3.613 7.923 3.176-7.924h4.456v.271z"/></svg>
           <br/>
            <a href="https://medium.com/@evanligon7/as-a-web-developer-i-am-constantly-immersed-in-the-ever-evolving-world-of-web-development-6e8316ecef24"><h2 style={{color:"white"}}> Medium Article</h2></a>
               <br/>
                <code  style={{color:"white",marginTop:"10%"}}>As a web developer, I am constantly immersed in the ever-evolving world of web development. Every day brings new challenges, new technologies, and new possibilities to explore.
                    At its core, web development is all about creating websites and web applications that are functional, user-friendly, and visually appealing. This involves a wide range of skills, from coding in programming languages like HTML, CSS, and JavaScript to designing and optimizing websites for search engines and user experience.
                    One of the things I love most about web development is the creative freedom it offers. There are endless ways to approach a project, and every developer brings their own unique style and perspective to the table. This means that no two websites are ever quite the same, and there is always something new to learn and discover.
                    Of course, web development also comes with its fair share of challenges. Keeping up with the latest trends and technologies can be a daunting task, and there are always bugs to fix and optimizations to make. However, these challenges are part of what makes web development such a rewarding and fulfilling career.
                    At the end of the day, what I love most about web development is the sense of satisfaction that comes from seeing a project come to life. Whether it’s a simple website or a complex web application, there’s something deeply satisfying about knowing that I’ve created something that people can use and enjoy.
                    So if you’re considering a career in web development, my advice is simple: dive in headfirst and embrace the challenges and opportunities that come your way. With passion, dedication, and a willingness to learn, you can become a skilled and successful web developer in no time.


                </code>
            </div>

                )
    }
}

export default BlogsPage




/*
import React from "react";
import { Row, Col, Spinner } from "react-bootstrap";
// @ts-ignore
import Typist from "react-typist";

import { db } from "../../firebase";
import BlogCard from "./BlogCard";
import "./blogs.css";

class BlogsPage extends React.Component<any, any> {
  ref: any;
  unsubscribe: any;

  constructor(props: any) {
    super(props);
    this.ref = db
      .collection("blogs")
      .orderBy("articleNo", "desc");
    this.unsubscribe = null;

    this.state = {
      blogs: []
    };
  }

  onCollectionUpdate = (querySnapshot: any) => {
    const blogs: any = [];
    querySnapshot.forEach((doc: any) => {
      const {
        title,
        shortDescription,
        minsRead,
        publishDate,
        publicUrl,
        imageUrl
      } = doc.data();
      blogs.push({
        key: doc.id,
        doc,
        title,
        shortDescription,
        minsRead,
        publishDate,
        publicUrl,
        imageUrl
      });
    });

    this.setState({
      blogs
    });

    console.log(this.state.blogs);
  };

  componentWillMount() {
    this.unsubscribe = this.ref.onSnapshot(this.onCollectionUpdate);
  }

  render() {
    let { blogs } = this.state;
    return (
      <div className="listOfBlogs">
        <div className="blogPageIntroSection">
          <Typist
            cursor={{ hideWhenDone: true }}
            avgTypingDelay={30}
            stdTypingDelay={20}
          >
            <Typist.Delay ms={500} />
            <span className="blogIntroText" style={{ color: "white" }}>
              I'm a Writer
            </span>
            <Typist.Backspace count={11} delay={300} />
            <span className="blogIntroText">
              {" write "}
              <span style={{ color: "#ff4f4f" }}>Code.</span>
            </span>
            <Typist.Backspace count={11} delay={300} />
            <span className="blogIntroText">
              write <span style={{ color: "#5896FF" }}>blogs.</span>
            </span>
            <Typist.Backspace count={14} delay={300} />
            <span className="blogIntroText" style={{ color: "white" }}>
              Learn samplePortfolios latest web and mobile technologies.
            </span>
          </Typist>
        </div>
        <div className="blogsListSection">
          {blogs.length === 0 ? (
            <div style={{ marginTop: "30vh", textAlign: "center" }}>
              <Spinner animation="grow" variant="danger" />
            </div>
            
          ) : (
            <Row className="blogColumn">
              {blogs.map((blog: any) => {
                return (
                  <Col xs={12} lg={5}>
                    <BlogCard
                      title={blog.title}
                      shortDescription={blog.shortDescription}
                      minsRead={blog.minsRead}
                      publishDate={blog.publishDate}
                      publicUrl={blog.publicUrl}
                      imageUrl={blog.imageUrl}
                    />
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </div>
    );
  }
}

export default BlogsPage;
*/
