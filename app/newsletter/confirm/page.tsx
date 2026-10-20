import ConfirmForm from './ConfirmForm';

export default async function NewsletterConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ConfirmForm token={typeof token === 'string' ? token : undefined} />;
}
