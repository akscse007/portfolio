import { AdminHeader } from '@/components/admin/fields';
import { PostEditor } from '../PostEditor';
import { postEditorOptions } from '../editor-data';

export const metadata = { title: 'New post' };

export default async function NewPostPage() {
  const opts = await postEditorOptions();
  return (
    <div>
      <AdminHeader
        title="New post"
        description="Write in Markdown with live preview. Autosave starts after the first save."
      />
      <PostEditor
        {...opts}
        initial={{
          slug: '',
          title: '',
          excerpt: '',
          content: '## Introduction\n\nStart writing…\n',
          difficulty: 'BEGINNER',
          topicId: '',
          seriesId: '',
          seriesOrder: '',
          cover: null,
          status: 'DRAFT',
          featured: false,
          seoTitle: '',
          seoDescription: '',
          publishedAt: '',
          tags: [],
          projectIds: [],
        }}
      />
    </div>
  );
}
