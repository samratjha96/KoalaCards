import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Container, Grid, Group, Text, Title } from '@mantine/core';
import { GetServerSideProps } from 'next';

export default function Landing() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/api/auth/signin');
  };

  return (
    <>
      <Head>
        <title>KoalaCards - Language Learning That Actually Works</title>
        <meta name="description" content="Learn languages the way your brain actually remembers them" />
      </Head>

      <div style={{
        backgroundColor: '#2d3748',
        color: 'white',
        padding: '30px 10px',
        textAlign: 'center',
      }}>
        <Title order={1} style={{ fontSize: '3em', fontWeight: 700, margin: 0 }}>KoalaCards 🐨</Title>
        <Text style={{ fontSize: '1.2em', marginTop: '15px', opacity: 0.9 }}>
          Learn languages the way your brain actually remembers them
        </Text>
      </div>

      <Container size="lg" py="xl">
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '50px 30px',
          marginBottom: '40px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <Title order={2} style={{ color: 'white', fontSize: '2.2em', marginBottom: '20px' }}>
            Language learning that sticks
          </Title>
          <Text style={{ fontSize: '1.2em', maxWidth: '600px', margin: '0 auto 30px' }}>
            Most language apps teach you to read. KoalaCards helps you
            speak, listen and remember full sentences.
          </Text>
          <Group justify="center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              style={{
                background: '#667eea',
                '&:hover': { background: '#5a67d8' },
              }}
            >
              Start Learning
            </Button>
            <Button
              component="a"
              href="https://www.patreon.com/rickcarlino"
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              style={{
                background: '#48bb78',
                '&:hover': { background: '#38a169' },
              }}
            >
              Support Development
            </Button>
          </Group>
        </div>

        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginBottom: '40px',
        }}>
          <Title order={2} style={{ color: '#2d3748', fontSize: '1.8em', marginBottom: '15px' }}>
            Watch KoalaCards in Action
          </Title>
          <Text>Watch a two-minute demo:</Text>
          <div style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            maxWidth: '100%',
            margin: '30px 0',
          }}>
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              src="https://www.youtube.com/embed/OWjfC7ia1c8"
              title="KoalaCards Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginBottom: '40px',
        }}>
          <Title order={2} style={{ color: '#2d3748', fontSize: '1.8em', marginBottom: '15px' }}>
            Why KoalaCards is Different
          </Title>
          <Text mb="lg">
            Traditional flashcard apps make you grade yourself. That's like
            marking your own homework – you'll either be too easy or too hard
            on yourself. KoalaCards uses AI to grade your speaking
            objectively, just like a real tutor would.
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                borderLeft: '4px solid #667eea',
              }}>
                <Title order={3} style={{ marginTop: 0, color: '#2d3748' }}>🎯 Smart Grading</Title>
                <Text>
                  AI understands what you meant to say, even if you didn't say
                  it perfectly. Just like a human teacher.
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                borderLeft: '4px solid #667eea',
              }}>
                <Title order={3} style={{ marginTop: 0, color: '#2d3748' }}>🗣️ Real Speaking Practice</Title>
                <Text>
                  Actually speak the language out loud. Your phone listens and
                  helps you improve your pronunciation.
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                borderLeft: '4px solid #667eea',
              }}>
                <Title order={3} style={{ marginTop: 0, color: '#2d3748' }}>🎧 Natural Listening</Title>
                <Text>
                  Train your ears with native speaker audio. No more
                  deer-in-headlights moments in real conversations.
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                borderLeft: '4px solid #667eea',
              }}>
                <Title order={3} style={{ marginTop: 0, color: '#2d3748' }}>🧠 Science-Based Timing</Title>
                <Text>
                  Reviews are scheduled exactly when you're about to forget.
                  Less time studying, better retention.
                </Text>
              </div>
            </Grid.Col>
          </Grid>
        </div>

        <Group justify="center" mt="xl">
          <Button
            size="lg"
            onClick={handleGetStarted}
            style={{
              background: '#667eea',
              '&:hover': { background: '#5a67d8' },
            }}
          >
            Get Started Now
          </Button>
        </Group>
      </Container>

      <div style={{
        textAlign: 'center',
        padding: '30px 20px',
        background: '#2d3748',
        color: 'white',
        marginTop: '60px',
      }}>
        <Text>Made with ❤️ by Rick Carlino</Text>
        <Group justify="center" mt="xs">
          <Link href="https://www.patreon.com/rickcarlino" passHref>
            <Text component="a" style={{ color: '#90cdf4', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
              Support on Patreon
            </Text>
          </Link>
          <Text>|</Text>
          <Link href="https://github.com/RickCarlino/KoalaCards" passHref>
            <Text component="a" style={{ color: '#90cdf4', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
              GitHub
            </Text>
          </Link>
          <Text>|</Text>
          <Link href="/api/auth/signin" passHref>
            <Text component="a" style={{ color: '#90cdf4', textDecoration: 'none' }}>
              Try the App
            </Text>
          </Link>
        </Group>
      </div>
    </>
  );
}

// This page should be accessible without authentication
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}
  };
}