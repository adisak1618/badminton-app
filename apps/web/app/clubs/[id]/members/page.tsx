"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MemberList } from "@/components/member-list";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

interface Member {
  memberId: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

interface Club {
  role: string;
}

export default function ClubMembersPage() {
  const params = useParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [membersRes, clubRes] = await Promise.all([
        fetch(`/api/proxy/clubs/${params.id}/members`),
        fetch(`/api/proxy/clubs/${params.id}`),
      ]);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
      if (clubRes.ok) {
        const club: Club = await clubRes.json();
        setCurrentUserRole(club.role);
      }
      setLoading(false);
    }
    loadData();
  }, [params.id]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const res = await fetch(
      `/api/proxy/clubs/${params.id}/members/${memberId}/role`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Failed to update role" }));
      alert(error.message);
      return;
    }

    // Refresh member list
    setMembers((prev) =>
      prev.map((m) =>
        m.memberId === memberId ? { ...m, role: newRole } : m
      )
    );
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Club Members</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {members.length} Member{members.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList
            members={members}
            currentUserRole={currentUserRole}
            clubId={params.id as string}
            onRoleChange={handleRoleChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
