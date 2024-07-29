import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import Lexus from '../Lexus_RZ_Artistic_Hero.jpeg';
import PodcastImage from '../GrowingBusinessPodcastImage.jpeg';

const ReviewComponent = ({ reviewerName, reviewDate, reviewerImage, reviewContent, link, embed }) => {
    return (
        <Container className=" p-4 my-4">
            <Row>
                <Col md={3}>
                    <Image src={reviewerImage} roundedCircle fluid />
                </Col>
                <Col md={9}>
                    <h4>{reviewerName}</h4>
                    <p className="text-muted">{reviewDate}</p>
                    <div>
                        <p>{reviewContent}</p>
                        {link && (
                            <p>
                                <span style={{ color: 'blue' }}>&hellip;</span>
                                <a href={link.url}>{link.text}</a>
                            </p>
                        )}
                        {embed && (
                            <div className="my-3">
                                <iframe
                                    style={{ borderRadius: '12px' }}
                                    src={embed}
                                    width="100%"
                                    height="352"
                                    frameBorder="0"
                                    allowFullScreen=""
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

const Review = () => {
    const articles = [
        {
            reviewerName: "Growing Your Business",
            reviewDate: "July 25, 2024, 12:00 ET",
            reviewerImage: PodcastImage,
            reviewContent: `
                Now available wherever your favorite hashtag#podcasts can be found is the latest episode of Growing Your Business hosted by Buddy Broyles.
                Our guest, @William Ligon, aka Evan, of Clubhouselinks.com joins Buddy to talk about his ambition to create a Google-like platform that can be managed
                by a single individual, requiring less funding and manpower. Evan's goal is aiding businesses with web development and design, particularly for small to
                medium-sized businesses. Evan mentions leveraging AI technology to automate news curation and promote products effectively through social media and email campaigns.
                He then emphasizes the importance of maintaining fresh content and engaging with customers through various digital channels like social media.
            `,
            link: { url: "https://lnkd.in/ge9mctSJ", text: "Listen Here" },
            embed: "https://open.spotify.com/embed/episode/7KYNViI3HhSv4moUqhkTIJ?utm_source=generator"
        },
        {
            reviewerName: "Lexus Toyota Connected North America",
            reviewDate: "Apr 03, 2023, 11:40 ET",
            reviewerImage: Lexus,
            reviewContent: `
                It's not hard to imagine your picture-perfect 2023 Lexus RX or 2023 Lexus RZ 450e luxury utility vehicle. But, it's even better to envision it on your own terms – especially amid the hustle and bustle of the New York International Auto Show (NYIAS).
                Through the power of artificial intelligence, guests attending NYIAS at the Jacob Javits Center from April 7-16 are able to type in a prompt for the Lexus RX or RZ, placing either vehicle in a setting limited only by their imagination, and manifest that vision into existence...
            `,
            link: { url: "https://www.prnewswire.com/news-releases/2023-new-york-international-auto-show-guests-use-artificial-intelligence-to-create-their-picture-perfect-lexus-301788551.html", text: "Read more" }
        }
    ];

    return (
        <div>
            {articles.map((article, index) => (
                <ReviewComponent
                    key={index}
                    reviewerName={article.reviewerName}
                    reviewDate={article.reviewDate}
                    reviewerImage={article.reviewerImage}
                    reviewContent={article.reviewContent}
                    link={article.link}
                    embed={article.embed}
                />
            ))}
        </div>
    );
};

export default Review;
