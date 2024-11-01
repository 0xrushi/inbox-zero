import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PenIcon } from "lucide-react";
import sortBy from "lodash/sortBy";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import prisma from "@/utils/prisma";
import { ClientOnly } from "@/components/ClientOnly";
import { GroupedTable } from "@/components/GroupedTable";
import { TopBar } from "@/components/TopBar";
import { CreateCategoryButton } from "@/app/(app)/smart-categories/CreateCategoryButton";
import { getUserCategories } from "@/utils/category.server";
import { CategorizeWithAiButton } from "@/app/(app)/smart-categories/CategorizeWithAiButton";
import {
  Card,
  CardContent,
  CardTitle,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Uncategorized } from "@/app/(app)/smart-categories/Uncategorized";
import { PermissionsCheck } from "@/app/(app)/PermissionsCheck";
import { ArchiveProgress } from "@/app/(app)/bulk-unsubscribe/ArchiveProgress";
import { PremiumAlertWithData } from "@/components/PremiumAlert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function CategoriesPage() {
  const session = await auth();
  const email = session?.user.email;
  if (!email) throw new Error("Not authenticated");

  const [senders, categories, user] = await Promise.all([
    prisma.newsletter.findMany({
      where: { userId: session.user.id, categoryId: { not: null } },
      select: {
        id: true,
        email: true,
        category: { select: { id: true, name: true } },
      },
    }),
    getUserCategories(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { autoCategorizeSenders: true },
    }),
  ]);

  if (!(senders.length > 0 || categories.length > 0))
    redirect("/smart-categories/setup");

  return (
    <NuqsAdapter>
      <PermissionsCheck />

      <ClientOnly>
        <ArchiveProgress />
      </ClientOnly>

      <PremiumAlertWithData className="mx-2 mt-2 sm:mx-4" />

      <Suspense>
        <Tabs defaultValue="categories">
          <TopBar className="items-center">
            <TabsList>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="uncategorized">Uncategorized</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/smart-categories/setup">
                  <PenIcon className="mr-2 size-4" />
                  Edit
                </Link>
              </Button>
              <CreateCategoryButton />
            </div>
          </TopBar>

          <TabsContent value="categories" className="m-0">
            {senders.length === 0 && (
              <Card className="m-4">
                <CardHeader>
                  <CardTitle>Categorize with AI</CardTitle>
                  <CardDescription>
                    Now that you have some categories, our AI can categorize
                    senders for you automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategorizeWithAiButton />
                </CardContent>
              </Card>
            )}

            <ClientOnly>
              <GroupedTable
                emailGroups={sortBy(
                  senders,
                  (sender) => sender.category?.name,
                ).map((sender) => ({
                  address: sender.email,
                  category: sender.category,
                }))}
                categories={categories}
              />
            </ClientOnly>
          </TabsContent>

          <TabsContent value="uncategorized" className="m-0">
            <Uncategorized
              categories={categories}
              autoCategorizeSenders={user?.autoCategorizeSenders || false}
            />
          </TabsContent>
        </Tabs>
      </Suspense>
    </NuqsAdapter>
  );
}
